import { AlertService } from "application/alert_service.ts";
import { AlertNotifier } from "application/alert_notifier.ts";
import { Context, Router } from "deps";
import { validate } from "shared/tools.ts";
import { sendBadRequest, sendOk } from "./responses.ts";
import {
  cancelAlertSchema,
  scheduleAlertSchema,
} from "./schemas/alert_schema.ts";

let websocktClients: WebSocket[] = [];

export default function (service: AlertService, notifier: AlertNotifier) {
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
      repeatEvery: event.data.repeatEvery.value,
    };

    cleanupDeadClients();

    for (const wb of websocktClients) {
      wb.send(JSON.stringify(data));
    }
  };

  notifier.onMessage(onMessageHandler);

  const router = new Router({ prefix: "/alerts" });
  router.post("/schedule", validate(scheduleAlertSchema), scheduleAlertHandler);
  router.post("/cancel", validate(cancelAlertSchema), cancelAlertHandler);
  router.get("/notifications", notifyClientsHandler);
  return router;
}
