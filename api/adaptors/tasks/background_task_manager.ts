import { Manager } from "../../application/alert_service.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { ID } from "../../domain/id.ts";

export enum CronType {
	PUBLISH = ("publish"),
}

export class BackgroundTaskManager implements Manager {
	readonly worker: Worker;

	constructor(specifier: string | URL, options?: WorkerOptions) {
		this.worker = new Worker(specifier, options);
	}

	registerCron(alert: Alert): void {
		this.worker.postMessage({ alert, type: CronType.PUBLISH });
	}

	removeCron(alertId: ID): void {}
}
