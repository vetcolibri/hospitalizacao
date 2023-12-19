import { Application, oakCors } from "deps";
import { makeTodayFormat } from "shared/tools.ts";
import patients_router from "./patients_router.ts";
import alerts_router from "./alerts_router.ts";
import rounds_router from "./rounds_router.ts";
import { AlertService } from "application/alert_service.ts";
import { AlertNotifier } from "application/alert_notifier.ts";
import { PatientService } from "application/patient_service.ts";
import { RoundService } from "application/round_service.ts";

const PORT = 8000;

export function startHttpServer(opts: {
  alertService: AlertService;
  patientService: PatientService;
  roundService: RoundService;
  notifier: AlertNotifier;
  port: number;
}) {
  const app = new Application();

  const patientRouter = patients_router(opts.patientService);
  const alertRouter = alerts_router(opts.alertService, opts.notifier);
  const roundRouter = rounds_router(opts.roundService);

  app.use(oakCors());
  app.use(patientRouter.routes());
  app.use(alertRouter.routes());
  app.use(roundRouter.routes());

  console.log(makeTodayFormat());
  console.log(`Starting server at http://localhost:${PORT}/`);
  console.log("Quit the server with CONTROL-C.");
  app.listen({ port: opts.port ?? PORT });
}
