import { CronType } from "../../adaptors/worker/worker_manager.ts";
import { Manager } from "../../application/alert_service.ts";
import { Alert } from "../../domain/alerts/alert.ts";

type Message = {
	alert: Alert;
	type: CronType;
};

interface mockWorker {
	postMessage(message: Message): void;
}

export class WorkerManagerMock implements Manager {
	readonly worker: mockWorker;

	constructor() {
		this.worker = {
			postMessage: (message: Message) => {
				return message;
			},
		};
	}

	registerCron(alert: Alert): void {
		this.worker.postMessage({ alert, type: CronType.PUBLISH });
	}

	removeCron(alert: Alert): void {
		this.worker.postMessage({ alert, type: CronType.REMOVE });
	}
}
