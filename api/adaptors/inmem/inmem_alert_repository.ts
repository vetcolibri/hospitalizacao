import { Alert, AlertStatus } from "../../domain/alerts/alert.ts";
import { AlertRepository } from "../../domain/alerts/alert_repository.ts";
import { Patient } from "../../domain/patients/patient.ts";

export class InmemAlertRepository implements AlertRepository {
	readonly #data: Record<string, Alert> = {};

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

	get records() {
		return Object.values(this.#data);
	}
}
