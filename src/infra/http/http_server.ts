import { Application, oakCors } from "deps";
import { makeTodayFormat } from "shared/tools.ts";
import patients_router from "./patients_router.ts";
import alerts_router from "./alerts_router.ts";
import rounds_router from "./rounds_router.ts";
import hospitalizations_router from "./hospitalizations_router.ts";
import budgets_router from "./budgets_router.ts";
import owners_router from "infra/http/owners_router.ts";
import { AlertService } from "application/alert_service.ts";
import { AlertNotifier } from "application/alert_notifier.ts";
import { PatientService } from "application/patient_service.ts";
import { RoundService } from "application/round_service.ts";
import { HospitalizationService } from "application/hospitalization_service.ts";
import { BudgetService } from "application/budget_service.ts";
import { OwnerService } from "application/owner_service.ts";

const PORT = 8000;

export function startHttpServer(opts: {
	alertService: AlertService;
	patientService: PatientService;
	roundService: RoundService;
	hospitalizationService: HospitalizationService;
	budgetService: BudgetService;
	ownerService: OwnerService;
	notifier: AlertNotifier;
	port: number;
}) {
	const app = new Application();

	const patientRouter = patients_router(opts.patientService);
	const alertRouter = alerts_router(opts.alertService, opts.notifier);
	const roundRouter = rounds_router(opts.roundService);
	const hospitalizationRouter = hospitalizations_router(opts.hospitalizationService);
	const budgetRouter = budgets_router(opts.budgetService);
	const ownerRouter = owners_router(opts.ownerService);

	app.use(oakCors());
	app.use(patientRouter.routes());
	app.use(alertRouter.routes());
	app.use(roundRouter.routes());
	app.use(hospitalizationRouter.routes());
	app.use(budgetRouter.routes());
	app.use(ownerRouter.routes());

	console.log(makeTodayFormat());
	console.log(`Starting server at http://localhost:${PORT}/`);
	console.log("Quit the server with CONTROL-C.");
	app.listen({ port: opts.port ?? PORT });
}
