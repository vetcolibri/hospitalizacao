import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "../adaptors/inmem/inmem_patient_repository.ts";
import { PatientService } from "../application/patient_service.ts";
import { Context, Router } from "../deps.ts";
import { Hospitalization, Patient } from "../domain/patients/patient.ts";
import { sendOk } from "./responses.ts";

const alertRepository = new InmemAlertRepository();
const patientRepository = new InmemPatientRepository();

const hospitalization = new Hospitalization(new Date().toISOString());
const patient = new Patient("some-id", "Rex");
patient.hospitalize(hospitalization);
patientRepository.save(patient);
const service = new PatientService(patientRepository, alertRepository);

interface PatientDTO {
	patientId: string;
	name: string;
	specie: string;
	issuedAt?: string;
	hasAlert?: boolean;
}

export default function () {
	const hospitalizedPatientsHandler = async (ctx: Context) => {
		const patients = await service.hospitalizadPatients();
		const DTO: PatientDTO[] = patients.map((patient) => (
			{
				patientId: patient.patientId.toString(),
				name: patient.name,
				specie: patient.specie.toString(),
				hasAlert: patient.alertStatus,
				issuedAt: patient.getActiveHospitalization()?.entryDate.toISOString(),
			}
		));
		sendOk(ctx, DTO);
	};
	const router = new Router({ prefix: "/patients" });
	router.get("/hospitalized", hospitalizedPatientsHandler);
	return router;
}
