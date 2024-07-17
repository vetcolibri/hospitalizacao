import { DB } from "deps";
import { Alert, AlertStatus } from "domain/hospitalization/alerts/alert.ts";
import { AlertNotFound } from "domain/hospitalization/alerts/alert_not_found_error.ts";
import { AlertRepository } from "domain/hospitalization/alerts/alert_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { EntityFactory } from "shared/factory.ts";
import { ID } from "shared/id.ts";

const factory = new EntityFactory();

export class SQLiteAlertRepository implements AlertRepository {
	#db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	getActives(): Promise<Alert[]> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM alerts WHERE status = :status",
			{ status: AlertStatus.Enabled },
		);

		const alerts = rows.map((row) => factory.createAlert(row));

		return Promise.resolve(alerts);
	}

	findAll(patientId: ID): Promise<Alert[]> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM alerts WHERE system_id = :systemId",
			{ systemId: patientId.value },
		);

		const alerts = rows.map((row) => factory.createAlert(row));

		return Promise.resolve(alerts);
	}

	verify(patientId: ID): Promise<boolean> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM alerts WHERE system_id = :systemId AND status = :status LIMIT 1",
			{ systemId: patientId.value, status: AlertStatus.Enabled },
		);

		return Promise.resolve(rows.length > 0);
	}

	save(alert: Alert): Promise<void> {
		this.#db.queryEntries(
			`INSERT INTO alerts (
				alert_id, 
				system_id, 
				parameters, 
				repeat_every, 
				time, 
				comments, 
				status
			) VALUES (
				:alertId, 
				:systemId, 
				:parameters, 
				:repeatEvery, 
				:time, 
				:comments, 
				:status
			)`,
			{
				alertId: alert.alertId.value,
				systemId: alert.patientId.value,
				parameters: JSON.stringify(alert.parameters.join(",")),
				repeatEvery: alert.repeatEvery,
				time: alert.time,
				comments: alert.comments,
				status: alert.status,
			},
		);

		return Promise.resolve(undefined);
	}

	last(): Promise<Alert> {
		const rows = this.#db.queryEntries("SELECT * FROM alerts ORDER BY alert_id DESC LIMIT 1");

		const alert = factory.createAlert(rows[0]);

		return Promise.resolve(alert);
	}

	active(alertId: ID): Promise<Either<AlertNotFound, Alert>> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM alerts WHERE alert_id = :alertId AND status = :status LIMIT 1",
			{ alertId: alertId.value, status: AlertStatus.Enabled },
		);

		if (rows.length === 0) return Promise.resolve(left(new AlertNotFound()));

		const alert = factory.createAlert(rows[0]);

		return Promise.resolve(right(alert));
	}

	update(alert: Alert): Promise<void> {
		this.#db.queryEntries("UPDATE alerts SET status = :status WHERE alert_id = :alertId", {
			alertId: alert.alertId.value,
			status: AlertStatus.Disabled,
		});

		return Promise.resolve(undefined);
	}
}
