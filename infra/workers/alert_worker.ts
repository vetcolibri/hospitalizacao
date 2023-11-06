import { CronType } from "../../adaptors/tasks/background_task_manager.ts";
import { Cron } from "../../deps.ts";

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
		const payload = {
			patient: {
				patientId: alert.patient.patientId.value,
				name: alert.patient.name,
			},
			alertId: alert.alertId.value,
			parameters: alert.parameters,
			comments: alert.comments,
			repeatEvery: alert.repeatEvery,
			time: alert.time,
		};
		job.schedule(() => self.postMessage(payload));
		jobs.set(alert.alertId.getValue(), job);
	}

	if (type === CronType.REMOVE) {
		const job = jobs.get(alert.alertId.getValue());
		if (job) {
			job.stop();
		}
	}
});
