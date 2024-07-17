import { Alert, AlertStatus } from "domain/alerts/alert.ts";
import { AlertNotFound } from "domain/alerts/alert_not_found_error.ts";
import { AlertRepository } from "domain/alerts/alert_repository.ts";
import { ID } from "shared/id.ts";
import { Either, left, right } from "shared/either.ts";

export class InmemAlertRepository implements AlertRepository {
	#data: Record<string, Alert> = {};

	getActives(): Promise<Alert[]> {
		const alerts = this.records.filter((a) => !a.isDisabled());
		return Promise.resolve(alerts);
	}

	active(AlertId: ID): Promise<Either<AlertNotFound, Alert>> {
		const alert = this.records.find(
			(alert) => alert.alertId.value === AlertId.value,
		);
		if (!alert) return Promise.resolve(left(new AlertNotFound()));
		return Promise.resolve(right(alert));
	}

	verify(patientId: ID): Promise<boolean> {
		const hasAlert = this.records.some(
			(alert) =>
				alert.patientId.value === patientId.value &&
				alert.status === AlertStatus.Enabled,
		);
		return Promise.resolve(hasAlert);
	}

	save(alert: Alert): Promise<void> {
		this.#data[alert.alertId.value] = alert;
		return Promise.resolve(undefined);
	}

	findAll(patientId: ID): Promise<Alert[]> {
		const alerts = this.records.filter(
			(alert) => alert.patientId.value === patientId.value,
		);
		return Promise.resolve(alerts);
	}

	last(): Promise<Alert> {
		const last = this.records[this.records.length - 1];
		return Promise.resolve(last);
	}

	update(alert: Alert): Promise<void> {
		this.#data[alert.alertId.value] = alert;
		return Promise.resolve(undefined);
	}

	get records() {
		return Object.values(this.#data);
	}
}
