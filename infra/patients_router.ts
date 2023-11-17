import { Context, Router } from "../deps.ts";
import { Patient } from "../domain/patients/patient.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
import { validate } from "../shared/tools.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendBadRequest, sendNotFound, sendOk } from "./responses.ts";
import { newPatientSchema, recuringHospitalizationSchema } from "./schemas/patient_schema.ts";
import { InmemServicesFactory } from "./services.ts";

const factory = new InmemServicesFactory();
const service = factory.createPatientService();

interface HospitalizationDTO {
	weight: number;
	complaints: string[];
	diagnostics: string[];
	entryDate: string;
	dischargeDate: string;
}

interface PatientsDTO {
	patientId: string;
	name: string;
	specie: string;
	breed: string;
	hasAlert: boolean;
	ownerName: string;
	ownerId: string;
	ownerPhoneNumber: string;
	hospitalization: HospitalizationDTO;
}

export default function () {
	const hospitalizedPatientsHandler = async (ctx: Context) => {
		const patients = await service.hospitalizadPatients();
		const patientDTO: PatientsDTO[] = patients.map((patient) => (
			{
				patientId: patient.patientId.getValue(),
				name: patient.name,
				specie: patient.specie.toString(),
				breed: patient.breed,
				hasAlert: patient.hasAlert,
				ownerName: patient.owner.name,
				ownerId: patient.owner.ownerId.getValue(),
				ownerPhoneNumber: patient.owner.phoneNumber,
				birthDate: patient.birthDate.getAge(),
				hospitalization: {
					weight: patient.openHospitalization()!.weight,
					complaints: patient.openHospitalization()!.complaints,
					diagnostics: patient.openHospitalization()!.diagnostics,
					entryDate: patient.openHospitalization()!.entryDate.toISOString(),
					dischargeDate: patient.openHospitalization()!.dischargeDate
						.toISOString(),
					budget: {
						startOn: patient.openHospitalization()!.activeBudget().startOn,
						endOn: patient.openHospitalization()!.activeBudget().endOn,
						status: patient.openHospitalization()!.activeBudget().status,
					},
				},
			}
		));
		sendOk(ctx, patientDTO);
	};

	const hospitalizePatientHandler = async (ctx: Context) => {
		const { patientId, hospitalizationData } = ctx.state.validatedData;
		const resultOrError = await service.newHospitalization(patientId, hospitalizationData);
		if (resultOrError.isLeft()) {
			if (resultOrError.value instanceof PatientNotFound) {
				sendNotFound(ctx, resultOrError.value.message);
				return;
			}
			sendBadRequest(ctx, resultOrError.value.message);
			return;
		}
		sendOk(ctx);
	};

	const nonHospitalizedHandler = async (ctx: ContextWithParams) => {
		const patientsOrError = await service.nonHospitalized();
		const patients = <Patient[]> patientsOrError.value;
		const results = patients.map((patient) => (
			{
				patientId: patient.patientId.getValue(),
				name: patient.name,
				specie: patient.specie.toString(),
				breed: patient.breed,
				ownerId: patient.owner.ownerId.getValue(),
				ownerName: patient.owner.name,
				ownerPhoneNumber: patient.owner.phoneNumber,
			}
		));
		sendOk(ctx, results);
	};

	const newPatientHandler = async (ctx: Context) => {
		const newPatientData = ctx.state.validatedData;
		const voidOrError = await service.newPatient(newPatientData);
		if (voidOrError.isLeft()) {
			sendBadRequest(ctx, voidOrError.value.message);
			return;
		}

		sendOk(ctx);
	};

	const router = new Router({ prefix: "/patients" });
	router.get("/hospitalized", hospitalizedPatientsHandler);
	router.post("/hospitalize", validate(recuringHospitalizationSchema), hospitalizePatientHandler);
	router.post("/new-patient", validate(newPatientSchema), newPatientHandler);
	router.get("/", nonHospitalizedHandler);
	return router;
}
