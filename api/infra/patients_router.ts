import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { InmemIdRepository } from "../adaptors/inmem/inmem_id_repository.ts";
import { PatientService } from "../application/patient_service.ts";
import { Context, Router } from "../deps.ts";
import { Patient } from "../domain/patients/patient.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
import { validate } from "../shared/tools.ts";
import { PatientRepositoryStub } from "../test_double/stubs/patient_repository_stub.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendBadRequest, sendNotFound, sendOk } from "./responses.ts";
import { newPatientSchema, recuringHospitalizationSchema } from "./schemas/patient_schema.ts";

const alertRepository = new InmemAlertRepository();
const idRepository = new InmemIdRepository();
const patientRepository = new PatientRepositoryStub();
const service = new PatientService(patientRepository, alertRepository, idRepository);

interface PatientDTO {
	patientId: string;
	name: string;
	specie: string;
	entryDate?: string;
	hasAlert?: boolean;
}

export default function () {
	const hospitalizedPatientsHandler = async (ctx: Context) => {
		const patients = await service.hospitalizadPatients();
		const patientDTO: PatientDTO[] = patients.map((patient) => (
			{
				patientId: patient.patientId.toString(),
				name: patient.name,
				specie: patient.specie.toString(),
				entryDate: patient.getActiveHospitalization()!.entryDate.toLocaleDateString(),
				hasAlert: patient.alertStatus,
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
				patientId: patient.patientId.toString(),
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
