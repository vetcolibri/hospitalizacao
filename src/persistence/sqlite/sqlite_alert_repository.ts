import { AlertNotFound } from "domain/alerts/alert_not_found_error.ts";
import { AlertRepository } from "domain/alerts/alert_repository.ts";
import { Alert, AlertStatus } from "domain/alerts/alert.ts";
import { Either, left, right } from "shared/either.ts";
import { DB } from "deps";
import { ID } from "shared/id.ts";
import { EntityFactory } from "shared/factory.ts";

const factory = new EntityFactory();

export class SQLiteAlertRepository implements AlertRepository {
	readonly #db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	findAll(patientId: ID): Promise<Alert[]> {
		const sql = `
			SELECT alerts.status as alert_status, * FROM alerts 
			JOIN patients ON alerts.system_id = patients.system_id 
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE alerts.system_id = '${patientId.value}'
		`;
		const rows = this.#db.queryEntries(sql);

		const alerts: Alert[] = [];

		if (rows.length === 0) return Promise.resolve(alerts);

		rows.forEach((row) => {
			const alert = factory.createAlert(row);

			alerts.push(alert);
		});

		return Promise.resolve(alerts);
	}

	verify(patientId: ID): Promise<boolean> {
		const sql = `
			SELECT * FROM alerts 
			WHERE system_id = ? AND status = ?
			LIMIT 1
		`;
		const rows = this.#db.queryEntries(sql, [
			patientId.value,
			AlertStatus.ENABLED,
		]);

		return Promise.resolve(rows.length > 0);
	}

	save(alert: Alert): Promise<void> {
		const sql = `INSERT INTO alerts (
			alert_id,
			system_id,
			parameters,
			repeat_every,
			time,
			comments,
			status
		)  VALUES (
			'${alert.alertId.value}',
			'${alert.patient.systemId.value}',
			'${JSON.stringify(alert.parameters.join(","))}',
			'${alert.repeatEvery.value}',
			'${alert.time.toISOString()}',
			'${alert.comments}',
			'${alert.status}'
		)`;

		this.#db.query(sql);

		return Promise.resolve(undefined);
	}

	last(): Promise<Alert> {
		const sql = `
			SELECT alerts.status as alert_status, * FROM alerts
			JOIN patients ON alerts.system_id = patients.system_id
			JOIN owners ON patients.owner_id = owners.owner_id 
			ORDER BY alert_id DESC LIMIT 1
		`;
		const rows = this.#db.queryEntries(sql);

		const row = rows[0];

		const alert = factory.createAlert(row);

		return Promise.resolve(alert);
	}

	getById(alertId: ID): Promise<Either<AlertNotFound, Alert>> {
		const sql = `
			SELECT alerts.status as alert_status, * FROM alerts 
			JOIN patients ON alerts.system_id = patients.system_id 
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE alerts.alert_id = ? LIMIT 1`;
		const rows = this.#db.queryEntries(sql, [alertId.value]);

		if (rows.length === 0) return Promise.resolve(left(new AlertNotFound()));

		const row = rows[0];

		const alert = factory.createAlert(row);

		return Promise.resolve(right(alert));
	}

	update(alert: Alert): Promise<void> {
		const alertId = alert.alertId.value;

		const sql = "UPDATE alerts SET status = ? WHERE alert_id = ?";

		this.#db.query(sql, [AlertStatus.DISABLED, alertId]);

		return Promise.resolve(undefined);
	}
}
