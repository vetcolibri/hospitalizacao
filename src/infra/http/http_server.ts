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
import alerts_router from "./alerts_router.ts";
import budgets_router from "./budgets_router.ts";
import crm_router from "./crm_router.ts";
import hospitalizations_router from "./hospitalizations_router.ts";
import patients_router from "./patients_router.ts";
import rounds_router from "./rounds_router.ts";

const PORT = 8000;

export function startHttpServer(opts: {
	alertService: AlertService;
	patientService: PatientService;
	roundService: RoundService;
	hospitalizationService: HospitalizationService;
	budgetService: BudgetService;
	crmService: CrmService;
	notifier: AlertNotifier;
	port: number;
}) {
	const app = new Application();

	const patientRouter = patients_router(opts.patientService);
	const alertRouter = alerts_router(opts.alertService, opts.notifier);
	const roundRouter = rounds_router(opts.roundService);
	const hospitalizationRouter = hospitalizations_router(
		opts.hospitalizationService,
	);
	const budgetRouter = budgets_router(opts.budgetService);
	const crmRouter = crm_router(opts.crmService);

	app.use(oakCors());
	app.use(logger);
	app.use(patientRouter.routes());
	app.use(alertRouter.routes());
	app.use(roundRouter.routes());
	app.use(hospitalizationRouter.routes());
	app.use(budgetRouter.routes());
	app.use(crmRouter.routes());

	console.log(makeTodayFormat());
	console.log(`Starting server at http://localhost:${PORT}/`);
	console.log("Quit the server with CONTROL-C.");
	app.listen({ port: opts.port ?? PORT });
}
