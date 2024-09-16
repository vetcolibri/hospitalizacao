import { AlertService } from "application/alert_service.ts";
import { BudgetService } from "application/budget_service.ts";
import { CrmService } from "application/crm_service.ts";
import { HospitalizationService } from "application/hospitalization_service.ts";
import { PatientService } from "application/patient_service.ts";
import { RoundService } from "application/round_service.ts";
import { Client } from "deps";
import { startHttpServer } from "infra/http/http_server.ts";
import { WebWorkerAlertNotifier } from "infra/web_worker/web_worker_alert_notifier.ts";
import { PostgresAlertRepository } from "persistence/postgres/postgres_alert_repository.ts";
import { PostgresBudgetRepository } from "persistence/postgres/postgres_budget_repository.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { PostgresMeasurementService } from "persistence/postgres/postgres_measurement_service.ts";
import { PostgresOwnerRepository } from "persistence/postgres/postgres_owner_repository.ts";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";
import { PostgresReportRepository } from "persistence/postgres/postgres_report_repository.ts";
import { PostgresReportService } from "persistence/postgres/postgres_report_service.ts";
import { PostgresRoundRepository } from "persistence/postgres/postgres_round_repository.ts";

// const DB_PATH = Deno.env.get("DB_PATH") || "/data/db.sqlite";
const PORT = Deno.env.get("PORT") || "8000";
const DB_URL = Deno.env.get("DATABASE_URL");
if (!DB_URL) {
	console.error("DATABASE_URL enviroment variable is required");
	Deno.exit(1);
}

const databaseUrl = "postgres://192.168.148.109:9000/postgres?user=postgres&password=postgres";
const client = new Client(databaseUrl);

// Initialize adapters

const roundRepo = new PostgresRoundRepository(client);
const ownerRepo = new PostgresOwnerRepository(client);
const patientRepo = new PostgresPatientRepository(client);
const hospRepo = new PostgresHospitalizationRepository(client);
const budgetRepo = new PostgresBudgetRepository(client);
const alertRepo = new PostgresAlertRepository(client);
const reportRepo = new PostgresReportRepository(client);
const reportService = new PostgresReportService(client);
const measurementService = new PostgresMeasurementService(client);
const notifier = new WebWorkerAlertNotifier();

// Initialize application services
const patientService = new PatientService(
	patientRepo,
	ownerRepo,
	hospRepo,
	budgetRepo,
	alertRepo,
	notifier,
);
const alertService = new AlertService(
	alertRepo,
	patientRepo,
	notifier,
);
const roundService = new RoundService(roundRepo, patientRepo, measurementService);
const hospitalizationService = new HospitalizationService(
	hospRepo,
);
const budgetService = new BudgetService(budgetRepo);
const crmService = new CrmService(
	ownerRepo,
	patientRepo,
	reportRepo,
	budgetRepo,
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
