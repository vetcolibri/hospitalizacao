import { AlertNotFound } from "../../domain/alerts/alert_not_found_error.ts";
import { AlertRepository } from "../../domain/alerts/alert_repository.ts";
import { Alert, AlertStatus } from "../../domain/alerts/alert.ts";
import { Either, left, right } from "../../shared/either.ts";
import { Patient } from "../../domain/patients/patient.ts";
import { DB, RowObject } from "../../deps.ts";
import { ID } from "../../domain/id.ts";


export class SQLiteAlertRepository implements AlertRepository {
	readonly #db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	findAll(patientId: ID): Promise<Alert[]> {
		const sql = `
			SELECT alerts.status as alert_status, * FROM alerts 
			JOIN patients ON alerts.patient_id = '${patientId.getValue()}' 
			JOIN owners ON patients.owner_id = owners.owner_id`;
		const rows = this.#db.queryEntries(sql);
		const alerts: Alert[] = [];

		if (rows.length === 0) return Promise.resolve(alerts);

		rows.forEach((row) => {			
			const alertData = this.#composeAlertData(row);

			const alert = Alert.compose(alertData);

			alerts.push(alert);
		});

		this.#db.close();
		return Promise.resolve(alerts);
	}

	verify(patientId: ID): Promise<boolean> {
		const sql = "SELECT * FROM alerts WHERE patient_id = ? AND status = ?";
		const rows = this.#db.queryEntries(sql, [patientId.getValue(), AlertStatus.ACTIVE]);
		this.#db.close();

		if (rows.length === 0) return Promise.resolve(false);

		return Promise.resolve(true);
	}

	save(alert: Alert): Promise<void> {
		const sql = `INSERT INTO alerts (
				alert_id,
				patient_id,
				parameters,
				repeat_every,
				time,
				comments,
				status
			)  VALUES (
				'${alert.alertId.getValue()}',
				'${alert.patient.patientId.getValue()}',
				'${JSON.stringify(alert.parameters.join(","))}',
				'${alert.repeatEvery.getValue()}',
				'${alert.time.toISOString()}',
				'${alert.comments}',
				'${alert.status}'
			)
		`;

		this.#db.query(sql);
		
		return Promise.resolve(undefined);
	}

	last(): Promise<Alert> {
		const sql = `
			SELECT alerts.status as alert_status, * FROM alerts
			JOIN patients ON alerts.patient_id = patients.patient_id
			JOIN owners ON patients.owner_id = owners.owner_id 
			ORDER BY alert_id DESC LIMIT 1
		`;
		const rows = this.#db.queryEntries(sql);
		this.#db.close();

		const row = rows[0];

		const alertData = this.#composeAlertData(row);

		const alert = Alert.compose(alertData);

		return Promise.resolve(alert);
	}

	getById(alertId: ID): Promise<Either<AlertNotFound, Alert>> {
		const sql = `
			SELECT alerts.status as alert_status, * FROM alerts 
			JOIN patients ON alerts.patient_id = patients.patient_id 
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE alerts.alert_id = ? LIMIT 1`;
		const rows = this.#db.queryEntries(sql, [alertId.getValue()]);
		this.#db.close();

		if (rows.length === 0) return Promise.resolve(left(new AlertNotFound()));

		const row = rows[0]

		const alertData = this.#composeAlertData(row);

		const alert = Alert.compose(alertData);

		return Promise.resolve(right(alert))
	}

	update(alert: Alert): Promise<void> {
		const alertId = alert.alertId.getValue();
		
		const sql = "UPDATE alerts SET status = ? WHERE alert_id = ?";
		
		this.#db.query(sql, [AlertStatus.DISABLED, alertId]);
		
		return Promise.resolve(undefined);
	}

	#composeOwnerData(row: RowObject) {
		return {
			ownerId: ID.New(String(row.owner_id)),
			name: String(row.owner_name),
			phoneNumber: String(row.phone_number),
		};
	}

	#composePatientData(row: RowObject) {
		return {
			patientId: String(row.patient_id),
			name: String(row.name),
			specie: String(row.specie),
			breed: String(row.breed),
			status: String(row.status),
			birthDate: String(row.birth_date),
		};
	}

	#composeAlertData(row: RowObject) {
		const ownerData = this.#composeOwnerData(row);
		const patientData = this.#composePatientData(row);
		const patient = Patient.compose(patientData, ownerData);
		return {
			alertId: String(row.alert_id),
			parameters: String(row.parameters).split(","),
			rate: Number(row.repeat_every),
			time: String(row.time),
			comments: String(row.comments),
			status: String(row.alert_status),
			patient: patient,
		};
	}
}
