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
	birthDate: string;
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
				hasAlert: patient.alertStatus,
				ownerName: patient.owner.name,
				ownerId: patient.owner.ownerId.toString(),
				ownerPhoneNumber: patient.owner.phoneNumber,
				hospitalization: {
					birthDate: patient.activeHospitalization()!.birthDate.getAge(),
					weight: patient.activeHospitalization()!.weight,
					complaints: patient.activeHospitalization()!.complaints,
					diagnostics: patient.activeHospitalization()!.diagnostics,
					entryDate: patient.activeHospitalization()!.entryDate.toISOString(),
					dischargeDate: patient.activeHospitalization()!.dischargeDate
						.toISOString(),
					budget: {
						startOn: patient.activeHospitalization()!.activeBudget().startOn,
						endOn: patient.activeHospitalization()!.activeBudget().endOn,
						status: patient.activeHospitalization()!.activeBudget().status,
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
		const patients = patientsOrError.value as Patient[];
		const results = patients.map((patient) => (
			{
				patientId: patient.patientId.getValue(),
				name: patient.name,
				specie: patient.specie.toString(),
				breed: patient.breed,
				ownerName: patient.owner.name,
				ownerPhone: patient.owner.phoneNumber,
			}
		));
		sendOk(ctx, results);
	};

	const newPatientHandler = async (ctx: Context) => {
		const { patientData, hospitalizationData } = ctx.state.validatedData;
		await service.newPatient({ patientData, hospitalizationData });
		sendOk(ctx);
	};

	const router = new Router({ prefix: "/patients" });
	router.get("/hospitalized", hospitalizedPatientsHandler);
	router.post("/hospitalize", validate(recuringHospitalizationSchema), hospitalizePatientHandler);
	router.post("/new-patient", validate(newPatientSchema), newPatientHandler);
	router.get("/", nonHospitalizedHandler);
	return router;
}
