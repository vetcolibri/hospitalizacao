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
import { PostgresTransationController } from "persistence/postgres/postgres_transaction_controller.ts";
import { FixedUserRepository } from "persistence/fixed/fixed_user_repository.ts";
import { JwtTokenGenerator } from "infra/jwt/jwt_generator.ts";
import { AuthService } from "application/auth_service.ts";

const PORT = Deno.env.get("PORT") || "8000";
const SECRET_KEY = Deno.env.get("SECRET_KEY") || "secret-key";
const DATABASE_URL = Deno.env.get("DATABASE_URL");
if (!DATABASE_URL) {
    console.error("DATABASE_URL enviroment variable is required");
    Deno.exit(1);
}

console.log("Connecting to database:", DATABASE_URL);

const client = new Client(DATABASE_URL);

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
const transationController = new PostgresTransationController(client);
const userRepo = new FixedUserRepository()
const tokenGenerator = new JwtTokenGenerator(SECRET_KEY)
const notifier = new WebWorkerAlertNotifier();

// Initialize application services
const patientService = new PatientService(
    patientRepo,
    ownerRepo,
    hospRepo,
    budgetRepo,
    alertRepo,
    userRepo,
    notifier,
);
const alertService = new AlertService(
    alertRepo,
    patientRepo,
    userRepo,
    notifier,
);
const roundService = new RoundService(roundRepo, patientRepo, userRepo, measurementService);
const hospitalizationService = new HospitalizationService(
    hospRepo,
);
const budgetService = new BudgetService(budgetRepo, userRepo);
const crmService = new CrmService(
    ownerRepo,
    patientRepo,
    hospRepo,
    reportRepo,
    budgetRepo,
    userRepo,
    reportService,
);

const authService = new AuthService(userRepo, tokenGenerator)

startHttpServer({
    alertService,
    patientService,
    roundService,
    hospitalizationService,
    budgetService,
    crmService,
    authService,
    notifier,
    transationController,
    port: parseInt(PORT),
});
