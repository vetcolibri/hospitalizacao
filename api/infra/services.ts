import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { InmemIdRepository } from "../adaptors/inmem/inmem_id_repository.ts";
import { InmemPatientRepository } from "../adaptors/inmem/inmem_patient_repository.ts";
import { AlertService, Manager } from "../application/alert_service.ts";
import { PatientService } from "../application/patient_service.ts";

const alertRepository = new InmemAlertRepository();
const patientRepository = new InmemPatientRepository();
const idRepository = new InmemIdRepository();

interface ServicesFactory {
	createAlertService(tasks: Manager): AlertService;
	createPatientService(): PatientService;
}

export class InmemServicesFactory implements ServicesFactory {
	createAlertService(tasks: Manager): AlertService {
		return new AlertService(alertRepository, patientRepository, tasks);
	}

	createPatientService(): PatientService {
		return new PatientService(patientRepository, alertRepository, idRepository);
	}
}
