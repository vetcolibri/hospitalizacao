import { AlertNotifier } from "application/alert_notifier.ts";
import { AlertService } from "application/alert_service.ts";
import { BudgetService } from "application/budget_service.ts";
import { CrmService } from "application/crm_service.ts";
import { HospitalizationService } from "application/hospitalization_service.ts";
import { PatientService } from "application/patient_service.ts";
import { RoundService } from "application/round_service.ts";
import { Application, oakCors } from "deps";
import { logger } from "infra/http/logger.ts";
import { makeTodayFormat } from "shared/tools.ts";
import alerts_router from "infra/http/alerts_router.ts";
import budgets_router from "infra/http/budgets_router.ts";
import crm_router from "infra/http/crm_router.ts";
import hospitalizations_router from "infra/http/hospitalizations_router.ts";
import patients_router from "infra/http/patients_router.ts";
import rounds_router from "infra/http/rounds_router.ts";
import { TransactionController } from "shared/transaction_controller.ts";
import { AuthService } from "application/auth_service.ts";
import auth_router from "infra/http/auth_router.ts";

const PORT = 8000;

export function startHttpServer(opts: {
    alertService: AlertService;
    patientService: PatientService;
    roundService: RoundService;
    hospitalizationService: HospitalizationService;
    budgetService: BudgetService;
    crmService: CrmService;
    notifier: AlertNotifier;
    authService: AuthService;
    port: number;
    transationController: TransactionController;
}) {
    const app = new Application();

    const patientRouter = patients_router(opts.patientService, opts.transationController);
    const alertRouter = alerts_router(opts.alertService, opts.notifier, opts.transationController);
    const roundRouter = rounds_router(opts.roundService, opts.transationController);
    const hospitalizationRouter = hospitalizations_router(opts.hospitalizationService);
    const budgetRouter = budgets_router(opts.budgetService, opts.transationController);
    const crmRouter = crm_router(opts.crmService, opts.transationController);
    const authRouter = auth_router(opts.authService);

    app.use(oakCors());
    app.use(logger);
    app.use(patientRouter.routes());
    app.use(alertRouter.routes());
    app.use(roundRouter.routes());
    app.use(hospitalizationRouter.routes());
    app.use(budgetRouter.routes());
    app.use(crmRouter.routes());
    app.use(authRouter.routes())

    console.log(makeTodayFormat());
    console.log(`Starting server at http://localhost:${PORT}/`);
    console.log("Quit the server with CONTROL-C.");
    app.listen({ port: opts.port ?? PORT });
}
