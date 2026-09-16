import { PatientService } from "application/patient_service.ts";
import { Context, Router } from "deps";
import { Patient } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "infra/http/context_with_params.ts";
import {
	sendBadRequest,
	sendCreated,
	sendForbidden,
	sendNotFound,
	sendOk,
	sendServerError,
} from "infra/http/responses.ts";
import {
	endBudgetSchema,
	endhospitalizationSchema,
	newHospitalizationSchema,
	newPatientSchema,
} from "infra/http/schemas/patient_schema.ts";
import { TransactionController } from "shared/transaction_controller.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";

interface PatientDTO {
	systemId: string;
	patientId: string;
	name: string;
	specie: string;
	breed: string;
	status: string;
	birthDate: string;
	age: string;
	ownerId: string;
}

function toPatientDTO(patient: Patient): PatientDTO {
	return {
		systemId: patient.systemId.value,
		patientId: patient.patientId.value,
		name: patient.name,
		specie: patient.specie.toString(),
		breed: patient.breed,
		status: patient.status.toString(),
		birthDate: patient.birthDate.toISOString(),
		age: patient.birthDate.age,
		ownerId: patient.ownerId.value,
	};
}

export default function (service: PatientService, transaction: TransactionController) {
	const hospitalizedHandler = async (ctx: Context) => {
		const patients = await service.listHospitalizad();
		const patientDTO: PatientDTO[] = patients.map(toPatientDTO);
		sendOk(ctx, patientDTO);
	};

	const nonHospitalizedHandler = async (ctx: ContextWithParams) => {
		const patients = await service.listNonHospitalized();
		const patientDTO: PatientDTO[] = patients.map(toPatientDTO);
		sendOk(ctx, patientDTO);
	};

	const hospitalizeHandler = async (ctx: Context) => {
		const { patientId, hospitalizationData, budgetData, ownerData } = ctx.state.validatedData;
		const username = ctx.state.username;

		try {
			await transaction.begin();

			// A edição dos dados globais do tutor é aplicada primeiro na mesma
			// transacção: se a hospitalização ou o orçamento falharem, o rollback
			// repõe também o tutor.
			if (ownerData) {
				const ownerOrErr = await service.updateOwner(patientId, ownerData, username);

				if (ownerOrErr.isLeft()) {
					await transaction.rollback();

					if (ownerOrErr.value instanceof PermissionDenied) {
						sendForbidden(ctx, ownerOrErr.value.message);
						return;
					}

					if (
						ownerOrErr.value instanceof PatientNotFound ||
						ownerOrErr.value instanceof OwnerNotFound
					) {
						sendNotFound(ctx, ownerOrErr.value.message);
						return;
					}

					sendBadRequest(ctx, ownerOrErr.value.message);
					return;
				}
			}

			const resultOrErr = await service.newHospitalization(
				patientId,
				hospitalizationData,
				budgetData,
				username,
			);

			if (resultOrErr.isLeft()) {
				await transaction.rollback();

				if (resultOrErr.value instanceof PatientNotFound) {
					sendNotFound(ctx, resultOrErr.value.message);
					return;
				}

				if (resultOrErr.value instanceof PermissionDenied) {
					sendForbidden(ctx, resultOrErr.value.message);
					return;
				}

				sendBadRequest(ctx, resultOrErr.value.message);
				return;
			}

			await transaction.commit();
			sendCreated(ctx);
		} catch (error) {
			await transaction.rollback();
			sendServerError(ctx, error instanceof Error ? error : new Error(String(error)));
		}
	};

	const searchPatientHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const username = ctx.state.username;

		const patientOrErr = await service.searchPatient(patientId, username);

		if (patientOrErr.isRight()) {
			sendOk(ctx, toPatientDTO(patientOrErr.value));
			return;
		}

		if (patientOrErr.value instanceof PatientNotFound) {
			sendNotFound(ctx, patientOrErr.value.message);
			return;
		}

		if (patientOrErr.value instanceof PermissionDenied) {
			sendForbidden(ctx, patientOrErr.value.message);
			return;
		}

		sendServerError(ctx, patientOrErr.value);
	};

	const getPatientHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const patientOrErr = await service.getPatientById(patientId);
		if (patientOrErr.isRight()) {
			sendOk(ctx, patientOrErr.value);
			return;
		}

		if (patientOrErr.value instanceof PatientNotFound) {
			sendNotFound(ctx, patientOrErr.value.message);
			return;
		}

		sendServerError(ctx, patientOrErr.value);
	};

	const newPatientHandler = async (ctx: Context) => {
		const newPatientData = ctx.state.validatedData;
		const username = ctx.state.username;
		try {
			await transaction.begin();

			const voidOrErr = await service.newPatient({ ...newPatientData, username: username });

			if (voidOrErr.isLeft()) {
				await transaction.rollback();
				sendBadRequest(ctx, voidOrErr.value.message);
				return;
			}

			await transaction.commit();

			sendCreated(ctx);
		} catch (error) {
			await transaction.rollback();
			sendServerError(ctx, error instanceof Error ? error : new Error(String(error)));
		}
	};

	const endHospitalizationHandler = async (ctx: Context) => {
		const { patientId } = ctx.state.validatedData;
		const username = ctx.state.username;
		try {
			await transaction.begin();

			const voidOrErr = await service.endHospitalization(patientId, username);

			if (voidOrErr.isLeft()) {
				await transaction.rollback();
				if (
					voidOrErr.value instanceof PatientNotFound ||
					voidOrErr.value instanceof BudgetNotFound
				) {
					sendNotFound(ctx, voidOrErr.value.message);
				} else {
					sendBadRequest(ctx, voidOrErr.value.message);
				}
				return;
			}

			await transaction.commit();

			sendOk(ctx);
		} catch (error) {
			await transaction.rollback();
			sendServerError(ctx, error instanceof Error ? error : new Error(String(error)));
		}
	};

	const endBudgetHandler = async (ctx: Context) => {
		const { patientId, hospitalizationId, status } = ctx.state.validatedData;
		const username = ctx.state.username;

		try {
			await transaction.begin();
			const voidOrErr = await service.endBudget(
				patientId,
				hospitalizationId,
				status,
				username,
			);

			if (voidOrErr.isLeft()) {
				await transaction.rollback();
				if (voidOrErr.value instanceof PatientNotFound) {
					sendNotFound(ctx, voidOrErr.value.message);
				} else {
					sendBadRequest(ctx, voidOrErr.value.message);
				}
				return;
			}

			await transaction.commit();

			sendOk(ctx);
		} catch (error) {
			await transaction.rollback();
			sendServerError(ctx, error instanceof Error ? error : new Error(String(error)));
		}
	};

	const router = new Router({ prefix: "/patients" });

	router.get("/hospitalized", hospitalizedHandler);
	router.get("/", nonHospitalizedHandler);
	router.post("/new-patient", validate(newPatientSchema), newPatientHandler);
	router.post(
		"/hospitalize",
		validate(newHospitalizationSchema),
		hospitalizeHandler,
	);
	router.get("/search/:patientId", searchPatientHandler);
	router.post(
		"/end-hospitalization",
		validate(endhospitalizationSchema),
		endHospitalizationHandler,
	);
	router.post("/end-budget", validate(endBudgetSchema), endBudgetHandler);
	router.get("/:patientId", getPatientHandler);
	return router;
}
