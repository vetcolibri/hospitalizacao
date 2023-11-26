import { Manager } from "../../application/alert_service.ts";
import { Alert } from "../../domain/alerts/alert.ts";

export enum CronType {
	PUBLISH = "publish",
	REMOVE = "remove",
}

export class WorkerManager implements Manager {
	readonly worker: Worker;

	constructor(specifier: string) {
		const url = new URL(specifier, import.meta.url).href;
		this.worker = new Worker(url, { type: "module" });
	}

	registerCron(alert: Alert): void {
		this.worker.postMessage({ alert, type: CronType.PUBLISH });
	}

	removeCron(alert: Alert): void {
		this.worker.postMessage({ alert, type: CronType.REMOVE });
	}
}
