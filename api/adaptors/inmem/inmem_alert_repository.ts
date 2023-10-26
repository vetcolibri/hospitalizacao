import { Alert, AlertStatus } from "../../domain/alerts/alert.ts";
import { AlertRepository } from "../../domain/alerts/alert_repository.ts";
import { ID } from "../../domain/id.ts";
import { Patient } from "../../domain/patients/patient.ts";

export class InmemAlertRepository implements AlertRepository {
	readonly #data: Record<string, Alert> = {};

	getById(AlertId: ID): Promise<Alert> {
		const alert = this.#data[AlertId.toString()];
		return Promise.resolve(alert);
	}

	verify(patient: Patient): Promise<boolean> {
		const hasAlert = this.records.some((alert) =>
			alert.patient === patient && alert.status === AlertStatus.ENABLE
		);
		return Promise.resolve(hasAlert);
	}

	save(alert: Alert): Promise<void> {
		this.#data[alert.alertId.toString()] = alert;
		return Promise.resolve(undefined);
	}

	findAll(patientId: ID): Promise<Alert[]> {
		const alerts = this.records.filter((alert) =>
			alert.patient.patientId.toString() === patientId.toString()
		);
		return Promise.resolve(alerts);
	}

	last(): Promise<Alert> {
		const last = this.records[this.records.length - 1];
		return Promise.resolve(last);
	}

	update(alert: Alert): Promise<void> {
		this.#data[alert.alertId.toString()] = alert;
		return Promise.resolve(undefined);
	}

	get records() {
		return Object.values(this.#data);
	}
}
