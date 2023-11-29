import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { Either, left, right } from "../../shared/either.ts";
import { EntityFactory } from "../../shared/factory.ts";
import { ID } from "../../domain/id.ts";
import { DB, RowObject } from "../../deps.ts";
import { Owner } from "../../domain/patients/owner.ts";
import { OwnerNotFound } from "../../domain/patients/owner_not_found_error.ts";

const factory = new EntityFactory();

export class SQLitePatientRepository implements PatientRepository {
	readonly #db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const sql = `
			SELECT hospitalizations.status as h_status, * FROM hospitalizations
			JOIN patients ON hospitalizations.patient_id = patients.patient_id
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE patients.patient_id = '${patientId.getValue()}'
		`;

		const rows = this.#db.queryEntries(sql);

		if (rows.length === 0) return Promise.resolve(left(new PatientNotFound()));

		const patient = factory.createPatient(rows[0]);

		for (const row of rows) {
			const hospitalization = factory.createHospitalization(row);
			patient.hospitalizations.push(hospitalization);
		}

		return Promise.resolve(right(patient));
	}

	async save(patient: Patient): Promise<void> {
		const hospitalization = patient.openHospitalization();
		const budget = hospitalization?.activeBudget();

		const owner = await this.findOwner(patient.owner.ownerId);
		if (owner.isLeft()) {
			const sql1 = `INSERT INTO owners (
				owner_id,
				owner_name,
				phone_number
			) VALUES (
				'${patient.owner.ownerId.getValue()}',
				'${patient.owner.name}',
				'${patient.owner.phoneNumber}'
			)`;
			this.#db.query(sql1);
		}

		const sql2 = `INSERT INTO patients (
			patient_id,
			name,
			breed,
			specie,
			birth_date,
			owner_id,
			status
		) VALUES (
			'${patient.patientId.getValue()}',
			'${patient.name}',
			'${patient.breed}',
			'${patient.specie}',
			'${patient.birthDate.value.toISOString()}',
			'${patient.owner.ownerId.getValue()}',
			'${patient.status}'
		)`;

		const sql3 = `INSERT INTO hospitalizations (
			hospitalization_id,
			patient_id,
			weight,
			entry_date,
			discharge_date,
			complaints,
			diagnostics,
			status
		) VALUES (
			'${hospitalization?.hospitalizationId.getValue()}',
			'${patient.patientId.getValue()}',
			${hospitalization?.weight},
			'${hospitalization?.entryDate}',
			'${hospitalization?.dischargeDate}',
			'${JSON.stringify(hospitalization?.complaints.join(","))}',
			'${JSON.stringify(hospitalization?.diagnostics.join(","))}',
			'${hospitalization?.status}'
		)`;

		const sql4 = `INSERT INTO budgets (
			budget_id,
			hospitalization_id,
			start_on,
			end_on,
			status,
			days
		) VALUES (
			'${budget?.budgetId.getValue()}',
			'${hospitalization?.hospitalizationId.getValue()}',
			'${budget?.startOn.toISOString()}',
			'${budget?.endOn.toISOString()}',
			'${budget?.status}',
			${budget?.durationInDays}
		)`;

		this.#db.query(sql2);

		this.#db.query(sql3);

		this.#db.query(sql4);

		return Promise.resolve(undefined);
	}

	update(patient: Patient): Promise<void> {
		const hospitalization = patient.openHospitalization();
		const budget = hospitalization?.activeBudget();

		const sql = `
            INSERT INTO hospitalizations (
                hospitalization_id,
                patient_id,
                weight,
                entry_date,
                discharge_date,
                complaints,
                diagnostics,
                status
            ) VALUES (
                '${hospitalization?.hospitalizationId.getValue()}',
                '${patient.patientId.getValue()}',
                ${hospitalization?.weight},
                '${hospitalization?.entryDate}',
                '${hospitalization?.dischargeDate}',
                '${JSON.stringify(hospitalization?.complaints.join(","))}',
                '${JSON.stringify(hospitalization?.diagnostics.join(","))}',
                '${hospitalization?.status}'
            )
        `;

		const sql1 = `INSERT INTO budgets (
			budget_id,
			hospitalization_id,
			start_on,
			end_on,
			status,
			days
		) VALUES (
			'${budget?.budgetId.getValue()}',
			'${hospitalization?.hospitalizationId.getValue()}',
			'${budget?.startOn.toISOString()}',
			'${budget?.endOn.toISOString()}',
			'${budget?.status}',
			${budget?.durationInDays}
		)`;

		this.#db.query(sql);

		this.#db.query(sql1);

		const sql2 = `
            UPDATE patients SET status = '${PatientStatus.HOSPITALIZED}'
            WHERE patient_id = '${patient.patientId.getValue()}'
        `;

		this.#db.query(sql2);

		return Promise.resolve(undefined);
	}

	hospitalized(): Promise<Patient[]> {
		const sql = `
			SELECT hospitalizations.status as h_status, budgets.status as b_status, * FROM hospitalizations
			JOIN budgets ON hospitalizations.hospitalization_id = budgets.hospitalization_id
			JOIN patients ON hospitalizations.patient_id = patients.patient_id
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE patients.status = '${PatientStatus.HOSPITALIZED}'
		`;
		const rows = this.#db.queryEntries(sql);

		const patients: Patient[] = [];

		rows.forEach((row) => {
			this.#buildPatients(patients, row);
		});

		return Promise.resolve(patients);
	}

	nonHospitalized(): Promise<Patient[]> {
		const sql = `
			SELECT hospitalizations.status as h_status, * FROM hospitalizations
			JOIN patients ON hospitalizations.patient_id = patients.patient_id
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE patients.status = '${PatientStatus.DISCHARGED}'
		`;

		const rows = this.#db.queryEntries(sql);

		const patients: Patient[] = [];

		rows.forEach((row) => {
			this.#buildPatients(patients, row);
		});

		return Promise.resolve(patients);
	}

	exists(patientId: ID): Promise<boolean> {
		const query = `
            SELECT patient_id FROM patients 
            WHERE patient_id = '${patientId.getValue()}'
        `;
		const rows = this.#db.queryEntries(query);

		return Promise.resolve(rows.length > 0);
	}

	findOwner(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
		const sql = `SELECT * FROM owners WHERE owner_id = '${ownerId.getValue()}' LIMIT 1`;
		const rows = this.#db.queryEntries(sql);

		if (rows.length === 0) return Promise.resolve(left(new OwnerNotFound()));

		const owner = factory.createOwner(rows[0]);

		return Promise.resolve(right(owner));
	}

	#buildPatients(patients: Patient[], row: RowObject) {
		const patient = patients.find((patient) => patient.patientId.getValue() === row.patient_id);

		if (patient) {
			const hospitalization = factory.createHospitalization(row);
			const budgetData = factory.createBudgetData(row);
			patient.hospitalizations.push(hospitalization);
			hospitalization.addBudget(budgetData);
			return;
		}

		if (!patient) {
			const patient = factory.createPatient(row);
			const budgetData = factory.createBudgetData(row);
			const hospitalization = factory.createHospitalization(row);
			hospitalization.addBudget(budgetData);
			patient.hospitalizations.push(hospitalization);
			patients.push(patient);
		}
	}
}
