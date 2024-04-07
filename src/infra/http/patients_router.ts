import { PatientService } from "application/patient_service.ts";
import { Context, Router } from "deps";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendBadRequest, sendCreated, sendNotFound, sendOk } from "./responses.ts";
import { newPatientSchema, recuringHospitalizationSchema } from "./schemas/patient_schema.ts";
import { Patient } from "domain/patients/patient.ts";
import { Hospitalization } from "domain/patients/hospitalization.ts";

interface HospitalizationDTO {
	weight: number;
	complaints: string[];
	diagnostics: string[];
	status: string;
	entryDate: string;
	dischargeDate?: string;
	budget: {
		startOn: string;
		endOn: string;
		status: string;
	};
}

interface OwnerDTO {
	ownerId: string;
	name: string;
	phoneNumber: string;
}

interface PatientDTO {
	systemId: string;
	patientId: string;
	name: string;
	specie: string;
	breed: string;
	hasAlert: boolean;
	birthDate: string;
	owner: OwnerDTO;
}

interface PatientHospitalizedDTO extends PatientDTO {
	hospitalization: HospitalizationDTO;
}

interface PatientNonHospitalizedDTO extends PatientDTO {
	hospitalizations: HospitalizationDTO[];
}

function toHospitalizationDTO(hospitalization: Hospitalization): HospitalizationDTO {
	return {
		weight: hospitalization.weight,
		complaints: hospitalization.complaints,
		diagnostics: hospitalization.diagnostics,
		entryDate: hospitalization.entryDate.toISOString(),
		// dischargeDate: hospitalization.dischargeDate?.toISOString(),
		status: hospitalization.status,
		budget: {
			startOn: hospitalization.activeBudget().startOn.toISOString(),
			endOn: hospitalization.activeBudget().endOn.toISOString(),
			status: hospitalization.activeBudget().status,
		},
	};
}

function toPatientHospitalizedDTO(patient: Patient): PatientHospitalizedDTO {
	const hospitalization = patient.openHospitalization()!;
	return {
		systemId: patient.systemId.value,
		patientId: patient.patientId.value,
		name: patient.name,
		specie: patient.specie.toString(),
		breed: patient.breed,
		hasAlert: patient.hasAlert,
		owner: {
			ownerId: patient.owner.ownerId.value,
			name: patient.owner.name,
			phoneNumber: patient.owner.phoneNumber,
		},
		birthDate: patient.birthDate.age,
		hospitalization: toHospitalizationDTO(hospitalization),
	};
}

function toPatientNonHospitalizedDTO(patient: Patient): PatientNonHospitalizedDTO {
	const hospitalizations = patient.hospitalizations.map(toHospitalizationDTO);
	return {
		systemId: patient.systemId.value,
		patientId: patient.patientId.value,
		name: patient.name,
		specie: patient.specie.toString(),
		breed: patient.breed,
		hasAlert: patient.hasAlert,
		owner: {
			ownerId: patient.owner.ownerId.value,
			name: patient.owner.name,
			phoneNumber: patient.owner.phoneNumber,
		},
		birthDate: patient.birthDate.age,
		hospitalizations,
	};
}

export default function (service: PatientService) {
	const hospitalizedPatientsHandler = async (ctx: Context) => {
		const patients = await service.hospitalizadPatients();
		const patientDTO: PatientHospitalizedDTO[] = patients.map(toPatientHospitalizedDTO);
		sendOk(ctx, patientDTO);
	};

	const hospitalizePatientHandler = async (ctx: Context) => {
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

	const nonHospitalizedHandler = async (ctx: ContextWithParams) => {
		const patients = await service.nonHospitalized();
		const patientDTO: PatientNonHospitalizedDTO[] = patients.map(toPatientNonHospitalizedDTO);
		sendOk(ctx, patientDTO);
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

	const findOwnerHandler = async (ctx: ContextWithParams) => {
		const ownerId = ctx.params.ownerId;
		const ownerOrErr = await service.findOwner(ownerId);

		if (ownerOrErr.isLeft()) {
			sendNotFound(ctx, ownerOrErr.value.message);
			return;
		}

		const owner = ownerOrErr.value;
		const ownerDTO = {
			ownerId: owner.ownerId.value,
			name: owner.name,
			phoneNumber: owner.phoneNumber,
		};

		sendOk(ctx, ownerDTO);
	};

	const router = new Router({ prefix: "/patients" });
	router.get("/hospitalized", hospitalizedPatientsHandler);
	router.post(
		"/hospitalize",
		validate(recuringHospitalizationSchema),
		hospitalizePatientHandler,
	);
	router.post("/new-patient", validate(newPatientSchema), newPatientHandler);
	router.get("/owner/:ownerId", findOwnerHandler);
	router.get("/", nonHospitalizedHandler);
	return router;
}
