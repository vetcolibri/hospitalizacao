import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "../adaptors/inmem/inmem_patient_repository.ts";
import { PatientService } from "../application/patient_service.ts";
import { Context, Router } from "../deps.ts";
import { Patient } from "../domain/patients/patient.ts";
import { sendOk } from "./responses.ts";

const alertRepository = new InmemAlertRepository();
const patientRepository = new InmemPatientRepository();
patientRepository.save(new Patient("some-id"));
const service = new PatientService(patientRepository, alertRepository);

interface PatientDTO {
	patientId: string;
	specie: string;
	hasAlert: boolean;
}

export default function () {
	const hospitalizedPatientsHandler = async (ctx: Context) => {
		const patients = await service.hospitalizadPatients();
		const DTO: PatientDTO[] = patients.map(({ patientId, alertStatus, specie }) => ({
			patientId: patientId.toString(),
			specie: specie.toString(),
			hasAlert: alertStatus,
		}));
		sendOk(ctx, DTO);
	};
	const router = new Router({ prefix: "/patients" });
	router.get("/hospitalized", hospitalizedPatientsHandler);
	return router;
}
