import { PatientService } from "application/patient_service.ts";
import { Context, Router } from "deps";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { Patient } from "domain/patient/patient.ts";
import { PatientAlreadyDischarged } from "domain/patient/patient_already_discharged_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendBadRequest, sendCreated, sendNotFound, sendOk } from "./responses.ts";
import {
	endBudgetSchema,
	endhospitalizationSchema,
	newHospitalizationSchema,
	newPatientSchema,
} from "./schemas/patient_schema.ts";

interface PatientDTO {
	systemId: string;
	patientId: string;
	name: string;
	specie: string;
	breed: string;
	status: string;
	birthDate: string;
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
		birthDate: patient.birthDate.age,
		ownerId: patient.ownerId.value,
	};
}

export default function (service: PatientService) {
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
		const { patientId, hospitalizationData } = ctx.state.validatedData;
		const resultOrErr = await service.newHospitalization(
			patientId,
			hospitalizationData,
		);

		if (resultOrErr.value instanceof PatientNotFound) {
			sendNotFound(ctx, resultOrErr.value.message);
			return;
		}

		if (resultOrErr.isLeft()) {
			sendBadRequest(ctx, resultOrErr.value.message);
			return;
		}
		sendCreated(ctx);
	};

	const newPatientHandler = async (ctx: Context) => {
		const newPatientData = ctx.state.validatedData;
		const voidOrErr = await service.newPatient(newPatientData);

		if (voidOrErr.isLeft()) {
			sendBadRequest(ctx, voidOrErr.value.message);
			return;
		}

		sendCreated(ctx);
	};

	const endHospitalizationHandler = async (ctx: Context) => {
		const { patientId } = ctx.state.validatedData;

		const voidOrErr = await service.endHospitalization(patientId);

		if (voidOrErr.value instanceof PatientNotFound) {
			sendNotFound(ctx, voidOrErr.value.message);
			return;
		}

		if (voidOrErr.value instanceof HospitalizationNotFound) {
			sendBadRequest(ctx, voidOrErr.value.message);
			return;
		}

		sendOk(ctx);
	};

	const endBudgetHandler = async (ctx: Context) => {
		const { patientId, hospitalizationId, status } = ctx.state.validatedData;

		const voidOrErr = await service.endBudget(
			patientId,
			hospitalizationId,
			status,
		);

		if (voidOrErr.value instanceof PatientNotFound) {
			sendNotFound(ctx, voidOrErr.value.message);
			return;
		}

		if (voidOrErr.value instanceof PatientAlreadyDischarged) {
			sendBadRequest(ctx, voidOrErr.value.message);
			return;
		}

		sendOk(ctx);
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
	router.post(
		"/end-hospitalization",
		validate(endhospitalizationSchema),
		endHospitalizationHandler,
	);
	router.post("/end-budget", validate(endBudgetSchema), endBudgetHandler);
	return router;
}
