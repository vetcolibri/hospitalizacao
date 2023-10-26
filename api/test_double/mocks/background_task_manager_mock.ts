import { CronType } from "../../adaptors/tasks/background_task_manager.ts";
import { Manager } from "../../application/alert_service.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { ID } from "../../domain/id.ts";

type Message = {
	alert: Alert;
	type: CronType;
};

interface mockWorker {
	postMessage(message: Message): void;
}

export class BackgroundTaskManagerMock implements Manager {
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

	removeCron(alertId: ID): void {}
}
