import { CronType } from "./web_worker_alert_notifier.ts";
import { Cron } from "deps";

const jobs = new Map();

onmessage = (event) => {
  const { type, alert } = event.data;

  if (type === CronType.PUBLISH) {
    const seconds = alert.time.getSeconds();
    const rate = alert.repeatEvery.value;
    const job = new Cron(`${seconds} * * * * *`, {
      interval: rate,
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
  }

  if (type === CronType.REMOVE) {
    const job = jobs.get(alert.alertId.value);
    if (job) {
      job.stop();
    }
  }
};
