import { AlertService } from "@application/alert_service.ts";
import { BudgetService } from "@application/budget_service.ts";
import { CrmService } from "@application/crm_service.ts";
import { HospitalizationService } from "@application/hospitalization_service.ts";
import { PatientService } from "@application/patient_service.ts";
import { RoundService } from "@application/round_service.ts";
import { startHttpServer } from "@infra/http/http_server.ts";
import { WebWorkerAlertNotifier } from "@infra/web_worker/web_worker_alert_notifier.ts";
import { InmemRoundRepository } from "@infra/persistence/inmem/inmem_round_repository.ts";
import { InmemHospitalizationRepository } from "@infra/persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemBudgetRepository } from "@infra/persistence/inmem/inmem_budget_repository.ts";
import { InmemAlertRepository } from "@infra/persistence/inmem/inmem_alert_repository.ts";
import { InmemReportRepository } from "@infra/persistence/inmem/inmem_report_repository.ts";
import { TransationControllerStub } from "./tests/stubs/transation_controller_stub.ts";
import { InmemMeasurementService } from "@infra/persistence/inmem/inmem_measurement_service.ts";
import { InmemReportService } from "@infra/persistence/inmem/inmem_report_service.ts";
import { AuthService } from "@application/auth_service.ts";
import { FixedUserRepository } from "@infra/persistence/fixed/fixed_user_repository.ts";
import { JwtTokenGenerator } from "@infra/jwt/jwt_generator.ts";
import { FixedPatientRepository } from "@infra/persistence/fixed/fixed_patient_repository.ts";
import { FixedOwnerRepository } from "@infra/persistence/fixed/fixed_owner_repository.ts";

const PORT = Deno.env.get("PORT") || "8000";
const roundRepo = new InmemRoundRepository();
const ownerRepo = new FixedOwnerRepository();
const patientRepo = new FixedPatientRepository();
const hospRepo = new InmemHospitalizationRepository();
const budgetRepo = new InmemBudgetRepository();
const alertRepo = new InmemAlertRepository();
const reportRepo = new InmemReportRepository();
const reportService = new InmemReportService();
const measurementService = new InmemMeasurementService();
const transationController = new TransationControllerStub();
const notifier = new WebWorkerAlertNotifier();
const userRepo = new FixedUserRepository();
const tokenGenerator = new JwtTokenGenerator("secret-key");

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
const authService = new AuthService(userRepo, tokenGenerator);

// console.log("InmemUserRepository.getByUsername", username, password);
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
