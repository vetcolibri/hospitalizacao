import { DB, SqliteOptions } from "../../deps.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { AlertNotFound } from "../../domain/alerts/alert_not_found_error.ts";
import { AlertRepository } from "../../domain/alerts/alert_repository.ts";
import { ID } from "../../domain/id.ts";
import { Patient } from "../../domain/patients/patient.ts";
import { Either } from "../../shared/either.ts";

export class SQLiteAlertRepository implements AlertRepository {
	readonly #db: DB;

	constructor(path?: string, options?: SqliteOptions) {
		this.#db = new DB(path, options);
	}

	findAll(patientId: ID): Promise<Alert[]> {
		const query =
			"SELECT * FROM alerts JOIN patients ON alerts.patient_id = ? JOIN owners ON patients.owner_id = owners.owner_id";
		const rows = this.#db.queryEntries(query, [patientId.getValue()]);
		const alerts: Alert[] = [];
		rows.forEach((row) => {
			const ownerData = {
				ownerId: row.owner_id as ID,
				name: row.owner_name as string,
				phoneNumber: row.phone_number as string,
			};

			const patientData = {
				patientId: row.patient_id as string,
				name: row.name as string,
				specie: row.specie as string,
				breed: row.breed as string,
				status: row.status as string,
				birthDate: row.birth_date as string,
			};

			const alertData = {
				alertId: row.alert_id,
				parameters: String(row.parameters).split(","),
				repeatEvery: row.repeat_every,
				time: row.time,
				comments: row.comments,
				status: row.status,
				patient: Patient.create(patientData, ownerData),
			};

			const alert = Alert.compose(alertData);

			alerts.push(alert);
		});

		this.#db.close();
		return Promise.resolve(alerts);
	}

	verify(patient: Patient): Promise<boolean> {
		throw new Error("Method not implemented.");
	}

	save(alert: Alert): Promise<void> {
		return Promise.resolve(undefined);
	}

	last(): Promise<Alert> {
		throw new Error("Method not implemented.");
	}

	getById(AlertId: ID): Promise<Either<AlertNotFound, Alert>> {
		throw new Error("Method not implemented.");
	}

	update(alert: Alert): Promise<void> {
		throw new Error("Method not implemented.");
	}

	get db(): DB {
		return this.#db;
	}
}
