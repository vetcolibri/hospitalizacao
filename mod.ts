import { AlertService } from "application/alert_service.ts";
import { BudgetService } from "application/budget_service.ts";
import { CrmService } from "application/crm_service.ts";
import { HospitalizationService } from "application/hospitalization_service.ts";
import { PatientService } from "application/patient_service.ts";
import { RoundService } from "application/round_service.ts";
import { startHttpServer } from "infra/http/http_server.ts";
import { WebWorkerAlertNotifier } from "infra/web_worker/web_worker_alert_notifier.ts";
import { SQLiteAlertRepository } from "persistence/sqlite/sqlite_alert_repository.ts";
import { SQLiteBudgetRepository } from "persistence/sqlite/sqlite_budget_repository.ts";
import { createSQLiteDB } from "persistence/sqlite/sqlite_db_factory.ts";
import { SQLiteHospitalizationRepository } from "persistence/sqlite/sqlite_hospitalization_repository.ts";
import { SQLiteOwnerRepository } from "persistence/sqlite/sqlite_owner_repository.ts";
import { SQLitePatientRepository } from "persistence/sqlite/sqlite_patient_repository.ts";
import { SQLiteReportRepository } from "persistence/sqlite/sqlite_report_repository.ts";
import { SQLiteReportService } from "persistence/sqlite/sqlite_report_service.ts";
import { SQLiteRoundRepository } from "persistence/sqlite/sqlite_round_repository.ts";

const DB_PATH = Deno.env.get("DB_PATH") || "/data/db.sqlite";
const PORT = Deno.env.get("PORT") || "8000";

// Initialize adapters
const db = createSQLiteDB(DB_PATH);

const patientRepository = new SQLitePatientRepository(db);
const alertRepository = new SQLiteAlertRepository(db);
const roundRepository = new SQLiteRoundRepository(db);
const ownerRepository = new SQLiteOwnerRepository(db);
const hospitalizationRepository = new SQLiteHospitalizationRepository(db);
const budgetRepository = new SQLiteBudgetRepository(db);
const reportRepository = new SQLiteReportRepository(db);
const notifier = new WebWorkerAlertNotifier();
const reportService = new SQLiteReportService(db);

// Initialize application services
const patientService = new PatientService(
	patientRepository,
	ownerRepository,
	hospitalizationRepository,
	budgetRepository,
	alertRepository,
	notifier,
);
const alertService = new AlertService(
	alertRepository,
	patientRepository,
	notifier,
);
const roundService = new RoundService(roundRepository, patientRepository);
const hospitalizationService = new HospitalizationService(
	hospitalizationRepository,
);
const budgetService = new BudgetService(budgetRepository);
const crmService = new CrmService(
	ownerRepository,
	patientRepository,
	reportRepository,
	budgetRepository,
	reportService,
);

startHttpServer({
	alertService,
	patientService,
	roundService,
	hospitalizationService,
	budgetService,
	crmService,
	notifier,
	port: parseInt(PORT),
});
