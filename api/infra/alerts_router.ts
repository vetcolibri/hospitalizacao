import { InmemAlertRepository } from "../adaptors/inmem/inmem_alert_repository.ts";
import { BackgroundTaskManager } from "../adaptors/tasks/background_task_manager.ts";
import { AlertService } from "../application/alert_service.ts";
import { Context, Router } from "../deps.ts";
import { validate } from "../shared/tools.ts";
import { PatientRepositoryStub } from "../test_double/stubs/patient_repository_stub.ts";
import { sendBadRequest, sendOk } from "./responses.ts";
import { cancelAlertSchema, scheduleAlertSchema } from "./schemas/alert_schema.ts";

const alertRepository = new InmemAlertRepository();
const patientRepository = new PatientRepositoryStub();
const workerUrl = "../../infra/workers/alert_worker.ts";
const backgroundTask = new BackgroundTaskManager(workerUrl);
const service = new AlertService(alertRepository, patientRepository, backgroundTask);
let websocktClients: WebSocket[] = [];

export default function () {
	const scheduleAlertHandler = async (ctx: Context) => {
		const { patientId, alertData } = ctx.state.validatedData;
		const { parameters, rate, time, comments } = alertData;
		const resultOrError = await service.schedule(patientId, parameters, rate, comments, time);
		if (resultOrError.isLeft()) {
			sendBadRequest(ctx, resultOrError.value.message);
			return;
		}
		sendOk(ctx);
	};

	const cancelAlertHandler = async (ctx: Context) => {
		const { alertId } = ctx.state.validatedData;
		const resultOrError = await service.cancel(alertId);
		if (resultOrError.isLeft()) {
			sendBadRequest(ctx, resultOrError.value.message);
			return;
		}
		sendOk(ctx);
	};

	const notifyClientsHandler = async (ctx: Context) => {
		const websocket = await ctx.upgrade();
		websocktClients.push(websocket);
		backgroundTask.worker.onmessage = (event) => {
			for (const wb of websocktClients) {
				if (wb.readyState === wb.OPEN) {
					wb.send(JSON.stringify(event.data));
				}
			}
			websocktClients = websocktClients.filter((wb) => wb.readyState === wb.OPEN);
		};
	};

	const router = new Router({ prefix: "/alerts" });
	router.post("/schedule", validate(scheduleAlertSchema), scheduleAlertHandler);
	router.post("/cancel", validate(cancelAlertSchema), cancelAlertHandler);
	router.get("/notifications", notifyClientsHandler);
	return router;
}
