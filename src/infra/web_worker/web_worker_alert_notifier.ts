import { AlertNotifier } from "application/alert_notifier.ts";
import { Alert } from "domain/alerts/alert.ts";

const WORKER_PATH = "./worker.js";

export enum CronType {
	PUBLISH = "publish",
	REMOVE = "remove",
}

export class WebWorkerAlertNotifier implements AlertNotifier {
	readonly #worker: Worker;

	constructor() {
		const url = new URL(WORKER_PATH, import.meta.url).href;
		this.#worker = new Worker(url, { type: "module" });
	}

	schedule(alert: Alert): void {
		const payload = {
			alertId: alert.alertId.value,
			patient: {
				name: alert.patient.name,
				patientId: alert.patient.patientId.value,
			},
			comments: alert.comments,
			time: alert.time,
			rate: alert.repeatEvery.value,
		};

		this.#worker.postMessage({ payload, type: CronType.PUBLISH });
	}

	cancel(alert: Alert): void {
		const payload = { alertId: alert.alertId.value };
		this.#worker.postMessage({ payload, type: CronType.REMOVE });
	}

	onMessage(cb: (event: MessageEvent) => void): void {
		this.#worker.onmessage = cb;
	}
}
