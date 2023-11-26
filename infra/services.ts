import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { InmemRoundRepository } from "../adaptors/inmem/inmem_round_repository.ts";
import { AlertService, Manager } from "../application/alert_service.ts";
import { PatientService } from "../application/patient_service.ts";
import { RoundService } from "../application/round_service.ts";
import { PatientRepositoryStub } from "../tests/test_double/stubs/patient_repository_stub.ts";
import { UserRepositoryStub } from "../tests/test_double/stubs/user_repository_stub.ts";

const alertRepository = new InmemAlertRepository();
const patientRepository = new PatientRepositoryStub();
const userRepository = new UserRepositoryStub();
const roundRepository = new InmemRoundRepository();

interface ServicesFactory {
	createAlertService(tasks: Manager): AlertService;
	createPatientService(): PatientService;
	createRoundService(): RoundService;
}

export class InmemServicesFactory implements ServicesFactory {
	createAlertService(tasks: Manager): AlertService {
		const deps = {
			alertRepository,
			patientRepository,
			taskManager: tasks,
		};
		return new AlertService(deps);
	}

	createPatientService(): PatientService {
		const deps = {
			alertRepository,
			patientRepository,
		};
		return new PatientService(deps);
	}

	createRoundService(): RoundService {
		const deps = {
			patientRepository,
			roundRepository,
			userRepository,
		};
		return new RoundService(deps);
	}
}
