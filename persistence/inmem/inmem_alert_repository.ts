import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { AlertNotFound } from "domain/hospitalization/alerts/alert_not_found_error.ts";
import { AlertRepository } from "domain/hospitalization/alerts/alert_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class InmemAlertRepository implements AlertRepository {
	#data: Record<string, Alert> = {};

	findActives(): Promise<Alert[]> {
		return Promise.resolve(this.records.filter((a) => !a.isCanceled()));
	}

	findById(AlertId: ID): Promise<Either<AlertNotFound, Alert>> {
		const alert = this.records.find(
			(alert) => alert.alertId.value === AlertId.value,
		);
		if (!alert) return Promise.resolve(left(new AlertNotFound()));
		return Promise.resolve(right(alert));
	}

	findByPatientId(patientId: ID): Promise<Alert[]> {
		const alerts = this.records.filter(
			(alert) => alert.patientId.value === patientId.value,
		);
		return Promise.resolve(alerts);
	}

	findActivesByPatientId(patientId: ID): Promise<Alert[]> {
		const alerts = this.records.filter((a) => a.patientId.equals(patientId) && !a.isCanceled());
		return Promise.resolve(alerts);
	}

	save(alert: Alert): Promise<void> {
		this.#data[alert.alertId.value] = alert;
		return Promise.resolve(undefined);
	}

	last(): Promise<Alert> {
		const last = this.records[this.records.length - 1];
		return Promise.resolve(last);
	}

	update(alert: Alert): Promise<void> {
		this.#data[alert.alertId.value] = alert;
		return Promise.resolve(undefined);
	}

	updateAll(alerts: Alert[]): Promise<void> {
		alerts.forEach((alert) => this.update(alert));
		return Promise.resolve(undefined);
	}

	get records() {
		return Object.values(this.#data);
	}
}
