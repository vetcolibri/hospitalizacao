import { CronType } from "../../adaptors/tasks/background_task_manager.ts";
import { Cron } from "../../deps.ts";
import { Alert } from "../../domain/alerts/alert.ts";

const jobs = new Map<string, Cron>();

self.addEventListener("message", (event) => {
	const { type, alert } = event.data;

	if (type === CronType.PUBLISH) {
		const seconds = alert.time.getSeconds();
		const job = new Cron(`${seconds} * * * * *`, {
			interval: alert.repeatEvery,
			timezone: "Africa/Luanda",
			startAt: alert.time.toISOString(),
		});
		job.schedule(() => self.postMessage(alert));
		jobs.set(alert.alertId.toString(), job);
	}

	if (type === CronType.REMOVE) {
		const job = jobs.get(alert.alertId.toString());
		if (job) {
			job.stop();
		}
	}
});
