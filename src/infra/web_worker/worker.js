import { CronType } from "./web_worker_alert_notifier.ts";
import { Cron } from "deps";

const jobs = new Map();

function stopJob(id) {
	const job = jobs.get(id);
	if (job) {
		job.stop();
	}
}

onmessage = (event) => {
	const { type, alert } = event.data;

	if (!type || !alert) {
		console.error("There's no value for type nor alert");
		return;
	}

	if (type === CronType.REMOVE) {
		stopJob(alert.alertId.value);
		return;
	}

	const seconds = alert.time.getSeconds();	
	const job = new Cron(`${seconds} * * * * *`, {
		interval: alert.repeatEvery.value,
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

	job.schedule(() => postMessage(payload));
	jobs.set(alert.alertId.value, job);
};
