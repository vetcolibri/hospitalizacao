import { AlertNotifier, AlertPayload } from "application/alert_notifier.ts";

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

	schedule(payload: AlertPayload): void {
		this.#worker.postMessage({ payload, type: CronType.PUBLISH });
	}

	cancel(alertId: string): void {
		const payload = { alertId };
		this.#worker.postMessage({ payload, type: CronType.REMOVE });
	}

	onMessage(cb: (event: MessageEvent) => void): void {
		this.#worker.onmessage = cb;
	}
}
