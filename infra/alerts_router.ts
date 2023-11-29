import { WorkerManager } from "../adaptors/worker/worker_manager.ts";
import { Context, Router } from "../deps.ts";
import { validate } from "../shared/tools.ts";
import { sendBadRequest, sendOk } from "./responses.ts";
import { cancelAlertSchema, scheduleAlertSchema } from "./schemas/alert_schema.ts";
import { ServiceFactory } from "./services.ts";

const workerUrl = "../../infra/workers/alert_worker.ts";
const backgroundTask = new WorkerManager(workerUrl);
const factory = new ServiceFactory();
const service = factory.createAlertService(backgroundTask);
let websocktClients: WebSocket[] = [];

export default function () {
	const scheduleAlertHandler = async (ctx: Context) => {
		const { patientId, alertData } = ctx.state.validatedData;
		const resultOrError = await service.schedule(patientId, alertData);
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
					const data = {
						...event.data,
						repeatEvery: event.data.repeatEvery.value,
					};
					wb.send(JSON.stringify(data));
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
