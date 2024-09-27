import { AlertNotifier } from "application/alert_notifier.ts";
import { AlertService } from "application/alert_service.ts";
import { Context, Router } from "deps";
import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { validate } from "shared/tools.ts";
import { sendBadRequest, sendOk, sendServerError } from "infra/http/responses.ts";
import { cancelAlertSchema, scheduleAlertSchema } from "infra/http/schemas/alert_schema.ts";
import { TransactionController } from "shared/transaction_controller.ts";

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

export default function (
    service: AlertService,
    notifier: AlertNotifier,
    transaction: TransactionController,
) {
    const scheduleHandler = async (ctx: Context) => {
        const { alertData } = ctx.state.validatedData;

        try {
            await transaction.begin();

            const voidOrErr = await service.schedule(alertData);

            if (voidOrErr.isLeft()) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            await transaction.commit();

            sendOk(ctx);
        } catch (error) {
            await transaction.rollback();
            sendBadRequest(ctx, error.message);
        }
    };

    const cancelHandler = async (ctx: Context) => {
        const { alertId } = ctx.state.validatedData;

        try {
            await transaction.begin();
            const voidOrErr = await service.cancel(alertId);

            if (voidOrErr.isLeft()) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            await transaction.commit();
            sendOk(ctx);
        } catch (error) {
            await transaction.rollback();
            sendServerError(ctx, error);
        }
    };

    const listActiveHandler = async (ctx: Context) => {
        const alerts = await service.getActiveAlerts();
        sendOk(ctx, alerts.map(toAlertDTO));
    };

    const notifyClientsHandler = (ctx: Context) => {
        cleanupDeadClients();

        const websocket = ctx.upgrade();
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
