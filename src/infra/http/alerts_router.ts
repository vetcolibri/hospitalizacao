import { AlertNotifier } from "application/alert_notifier.ts";
import { AlertService } from "application/alert_service.ts";
import { Context, Router } from "deps";
import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { validate } from "shared/tools.ts";
import { sendBadRequest, sendOk } from "./responses.ts";
import { cancelAlertSchema, scheduleAlertSchema } from "./schemas/alert_schema.ts";

let websocktClients: WebSocket[] = [];

interface AlertDTO {
	alertId: string;
	patientId: string;
	status: string;
}

function toAlertDTO(alert: Alert): AlertDTO {
	return {
		alertId: alert.alertId.value,
		patientId: alert.patientId.value,
		status: alert.status,
	};
}

export default function (service: AlertService, notifier: AlertNotifier) {
	const scheduleHandler = async (ctx: Context) => {
		const { alertData } = ctx.state.validatedData;

		const voidOrErr = await service.schedule(alertData);

		if (voidOrErr.isLeft()) {
			sendBadRequest(ctx, voidOrErr.value.message);
			return;
		}

		sendOk(ctx);
	};

	const cancelHandler = async (ctx: Context) => {
		const { alertId } = ctx.state.validatedData;

		const voidOrErr = await service.cancel(alertId);

		if (voidOrErr.isLeft()) {
			sendBadRequest(ctx, voidOrErr.value.message);
			return;
		}

		sendOk(ctx);
	};

	const listActiveHandler = async (ctx: Context) => {
		const alerts = await service.getActiveAlerts();
		sendOk(ctx, alerts.map(toAlertDTO));
	};

	const notifyClientsHandler = async (ctx: Context) => {
		cleanupDeadClients();

		const websocket = await ctx.upgrade();
		websocktClients.push(websocket);
	};

	const cleanupDeadClients = () => {
		websocktClients = websocktClients.filter((wb) => wb.readyState === wb.OPEN);
	};

	const onMessageHandler = (event: MessageEvent) => {
		const data = {
			...event.data,
			repeatEvery: event.data.rate,
		};

		cleanupDeadClients();

		for (const wb of websocktClients) {
			wb.send(JSON.stringify(data));
		}
	};

	notifier.onMessage(onMessageHandler);

	const router = new Router({ prefix: "/alerts" });
	router.post("/schedule", validate(scheduleAlertSchema), scheduleHandler);
	router.post("/cancel", validate(cancelAlertSchema), cancelHandler);
	router.get("/notifications", notifyClientsHandler);
	router.get("/active", listActiveHandler);
	return router;
}
