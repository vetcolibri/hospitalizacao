import { CronType } from "./web_worker_alert_notifier.ts";
import { Cron } from "deps";

const jobs = new Map();

onmessage = (event) => {
  const { type, payload } = event.data;

  if (!type || !payload) {
	console.error("There's no value for type or payload");
	return;
	}


  if (type === CronType.PUBLISH) { 
            
    const seconds = payload.time.getSeconds()
    
    const job = new Cron(`${seconds} * * * * *`, {
      interval: payload.rate,
      timezone: "Africa/Luanda",
      startAt: payload.time.toISOString(),
    });

    job.schedule(() => postMessage(payload));
    jobs.set(payload.alertId, job);
  }

  if (type === CronType.REMOVE) {
    stopCron(payload.alertId)
  }

};

function stopCron(alertId) {
  const job = jobs.get(alertId);
  if (job) {
    job.stop();
  }
}