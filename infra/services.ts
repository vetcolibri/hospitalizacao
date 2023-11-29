import { SQLiteAlertRepository } from "../adaptors/persistence/sqlite_alert_repository.ts";
import { SQLitePatientRepository } from "../adaptors/persistence/sqlite_patient_repository.ts";
import { SQLiteRoundRepository } from "../adaptors/persistence/sqlite_round_repository.ts";
import { AlertService, Manager } from "../application/alert_service.ts";
import { PatientService } from "../application/patient_service.ts";
import { RoundService } from "../application/round_service.ts";
import { DB } from "../deps.ts";

const db = new DB("db.sqlite3");
const alertRepository = new SQLiteAlertRepository(db);
const patientRepository = new SQLitePatientRepository(db);
const roundRepository = new SQLiteRoundRepository(db);

interface Services {
	createAlertService(tasks: Manager): AlertService;
	createPatientService(): PatientService;
	createRoundService(): RoundService;
}

export class ServiceFactory implements Services {
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
		};
		return new RoundService(deps);
	}
}
