import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { InmemIdRepository } from "../adaptors/inmem/inmem_id_repository.ts";
import { InmemPatientRepository } from "../adaptors/inmem/inmem_patient_repository.ts";
import { InmemRoundRepository } from "../adaptors/inmem/inmem_round_repository.ts";
import { AlertService, Manager } from "../application/alert_service.ts";
import { PatientService } from "../application/patient_service.ts";
import { RoundService } from "../application/round_service.ts";
import { PatientRepositoryStub } from "../test_double/stubs/patient_repository_stub.ts";
import { UserRepositoryStub } from "../test_double/stubs/user_repository_stub.ts";

const alertRepository = new InmemAlertRepository();
const patientRepository = new PatientRepositoryStub();
const idRepository = new InmemIdRepository();
const userRepository = new UserRepositoryStub();
const roundRepository = new InmemRoundRepository();

interface ServicesFactory {
	createAlertService(tasks: Manager): AlertService;
	createPatientService(): PatientService;
	createRoundService(): RoundService;
}

export class InmemServicesFactory implements ServicesFactory {
	createAlertService(tasks: Manager): AlertService {
		return new AlertService(alertRepository, patientRepository, tasks);
	}

	createPatientService(): PatientService {
		return new PatientService(patientRepository, alertRepository, idRepository);
	}

	createRoundService(): RoundService {
		return new RoundService(roundRepository, patientRepository, userRepository);
	}
}
