import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { InmemIdRepository } from "../adaptors/inmem/inmem_id_repository.ts";
import { PatientService } from "../application/patient_service.ts";
import { Context, Router } from "../deps.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
import { validate } from "../shared/tools.ts";
import { PatientRepositoryStub } from "../test_double/stubs/patient_repository_stub.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendBadRequest, sendNotFound, sendOk } from "./responses.ts";
import { patientSchema } from "./schemas/patient_schema.ts";

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
				entryDate: patient.getActiveHospitalization()!.entryDate.toISOString(),
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
	const getPatientHander = async (ctx: ContextWithParams) => {
		const patientOrError = await service.findPatient(ctx?.params?.patientId);
		if (patientOrError.isLeft()) {
			sendNotFound(ctx, patientOrError.value.message);
			return;
		}
		const patient = patientOrError.value;
		const patientDTO = {
			patientId: patient.patientId.toString(),
			name: patient.name,
			specie: patient.specie.toString(),
		};
		sendOk(ctx, patientDTO);
	};
	const router = new Router({ prefix: "/patients" });
	router.get("/hospitalized", hospitalizedPatientsHandler);
	router.post("/hospitalize", validate(patientSchema), hospitalizePatientHandler);
	router.get("/:patientId", getPatientHander);
	return router;
}
