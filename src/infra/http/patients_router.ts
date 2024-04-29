import { PatientService } from "application/patient_service.ts";
import { Context, Router } from "deps";
import { Patient } from "domain/patients/patient.ts";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendBadRequest, sendCreated, sendNotFound, sendOk } from "./responses.ts";
import {
	endhospitalizationSchema,
	newHospitalizationSchema,
	newPatientSchema,
} from "./schemas/patient_schema.ts";
import { HospitalizationAlreadyClosed } from "domain/patients/hospitalizations/hospitalization_already_closed_error.ts";

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

		if (voidOrErr.value instanceof HospitalizationAlreadyClosed) {
			sendBadRequest(ctx, voidOrErr.value.message);
			return;
		}

		sendOk(ctx);
	};

	const router = new Router({ prefix: "/patients" });
	router.get("/hospitalized", hospitalizedHandler);
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
	router.post("/new-patient", validate(newPatientSchema), newPatientHandler);
	router.get("/", nonHospitalizedHandler);
	return router;
}
