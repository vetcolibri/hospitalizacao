import { SQLiteAlertRepository } from "persistence/sqlite/sqlite_alert_repository.ts";
import { createSQLiteDB } from "persistence/sqlite/sqlite_db_factory.ts";
import { SQLitePatientRepository } from "persistence/sqlite/sqlite_patient_repository.ts";
import { SQLiteRoundRepository } from "persistence/sqlite/sqlite_round_repository.ts";
import { AlertService } from "application/alert_service.ts";
import { PatientService } from "application/patient_service.ts";
import { RoundService } from "application/round_service.ts";
import { WebWorkerAlertNotifier } from "infra/web_worker/web_worker_alert_notifier.ts";
import { startHttpServer } from "infra/http/http_server.ts";

const DB_PATH = Deno.env.get("DB_PATH") || "./db.sqlite";
const PORT = Deno.env.get("PORT") || "8000";

// Initialize adapters
const db = createSQLiteDB(DB_PATH);
const patientRepository = new SQLitePatientRepository(db);
const alertRepository = new SQLiteAlertRepository(db);
const roundRepository = new SQLiteRoundRepository(db);

const notifier = new WebWorkerAlertNotifier();

// Initialize application services
const patientService = new PatientService(patientRepository, alertRepository);

const alertService = new AlertService(
  alertRepository,
  patientRepository,
  notifier
);

const roundService = new RoundService(roundRepository, patientRepository);

startHttpServer({
  alertService,
  patientService,
  roundService,
  notifier,
  port: parseInt(PORT),
});
