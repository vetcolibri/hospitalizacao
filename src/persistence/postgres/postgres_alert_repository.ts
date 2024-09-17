import { Client } from "deps";
import { Alert, AlertStatus } from "domain/hospitalization/alerts/alert.ts";
import { AlertNotFound } from "domain/hospitalization/alerts/alert_not_found_error.ts";
import { AlertRepository } from "domain/hospitalization/alerts/alert_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class PostgresAlertRepository implements AlertRepository {
	constructor(private client: Client) {}

	async getActives(): Promise<Alert[]> {
		const result = await this.client.queryObject<AlertModel>(
			"SELECT * FROM alerts WHERE status = $STATUS",
			{ status: AlertStatus.Enabled },
		);

		return result.rows.map(alertFactory);
	}

	async findAll(patientId: ID): Promise<Alert[]> {
		const result = await this.client.queryObject<AlertModel>(
			"SELECT * FROM alerts WHERE system_id = $SYSTEM_ID",
			{ system_id: patientId.value },
		);

		return result.rows.map(alertFactory);
	}

	async findActives(patientId: ID): Promise<Alert[]> {
		const result = await this.client.queryObject<AlertModel>(
			"SELECT * FROM alerts WHERE system_id = $SYSTEM_ID AND status = $STATUS",
			{ system_id: patientId.value, status: AlertStatus.Enabled },
		);

		return result.rows.map(alertFactory);
	}

	async verify(patientId: ID): Promise<boolean> {
		const result = await this.client.queryObject(
			"SELECT * FROM alerts WHERE system_id = $SYSTEM_ID AND status = $STATUS LIMIT 1",
			{ system_id: patientId.value, status: AlertStatus.Enabled },
		);

		return result.rows.length > 0;
	}

	async save(alert: Alert): Promise<void> {
		await this.client.queryObject(
			`INSERT INTO alerts (
				alert_id, 
				system_id, 
				parameters, 
				repeat_every, 
				time, 
				comments, 
				status
			) VALUES (
				$1, 
				$2, 
				$3, 
				$4, 
				$5, 
				$6, 
				$7
			)`,
			[
				alert.alertId.value,
				alert.patientId.value,
				JSON.stringify(alert.parameters.join(",")),
				alert.repeatEvery,
				alert.time,
				alert.comments,
				alert.status,
			],
		);
	}

	async last(): Promise<Alert> {
		const result = await this.client.queryObject<AlertModel>(
			"SELECT * FROM alerts ORDER BY alert_id DESC LIMIT 1",
		);

		return alertFactory(result.rows[0]);
	}

	async active(alertId: ID): Promise<Either<AlertNotFound, Alert>> {
		const result = await this.client.queryObject<AlertModel>(
			"SELECT * FROM alerts WHERE alert_id = $ALERT_ID AND status = $STATUS LIMIT 1",
			{ alert_id: alertId.value, status: AlertStatus.Enabled },
		);

		if (result.rows.length === 0) return left(new AlertNotFound());

		return right(alertFactory(result.rows[0]));
	}

	async update(alert: Alert): Promise<void> {
		await this.client.queryObject(
			"UPDATE alerts SET status = $STATUS WHERE alert_id = $ALERT_ID",
			{
				alert_id: alert.alertId.value,
				status: AlertStatus.Disabled,
			},
		);
	}

	updateAll(alerts: Alert[]): Promise<void> {
		alerts.forEach(async (alert) => await this.update(alert));
		return Promise.resolve(undefined);
	}
}

interface AlertModel {
	alert_id: string;
	system_id: string;
	parameters: string;
	rate: number;
	time: string;
	comments: string;
	status: string;
}

function alertFactory(model: AlertModel): Alert {
	return Alert.restore({
		alertId: model.alert_id,
		patientId: model.system_id,
		parameters: model.parameters.split(","),
		rate: model.rate,	
		time: model.time,
		comments: model.comments,
		status: model.status,
	});
}
