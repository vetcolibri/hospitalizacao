import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { Hospitalization } from "../../domain/patients/hospitalization.ts";
import { Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { Either, left, right } from "../../shared/either.ts";
import { ComposeFactory } from "../../shared/factory.ts";
import { ID } from "../../domain/id.ts";
import { DB, RowObject } from "../../deps.ts";

const factory = new ComposeFactory();


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

		if (rows.length === 0) return Promise.resolve(left(new PatientNotFound()))
		
		const patientData = factory.composePatientData(rows[0]);

		const ownerData = factory.composeOwnerData(rows[0]);

		const patient = Patient.compose(patientData, ownerData);

		for (const row of rows) {
			const hospitalizations = factory.composeHospitalizationsData(row);
			const hospitalization = Hospitalization.compose(hospitalizations);
			patient.hospitalizations.push(hospitalization);
		}
		
		return Promise.resolve(right(patient));
		

	}

	save(patient: Patient): Promise<void> {
		const sql = `INSERT INTO owners (
			owner_id,
			owner_name,
			phone_number
		) VALUES (
			'${patient.owner.ownerId.getValue()}',
			'${patient.owner.name}',
			'${patient.owner.phoneNumber}'
		)`;

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
			'${patient.birthDate}',
			'${patient.owner.ownerId.getValue()}',
			'${patient.status}'
		)`;

		const hospitalization = patient.openHospitalization();

		const budget = hospitalization?.activeBudget();

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
			'start_on',
			'end_on',
			'status',
			'days'
		) VALUES (
			'${budget?.budgetId.getValue()}',
			'${hospitalization?.hospitalizationId.getValue()}',
			'${budget?.startOn}',
			'${budget?.endOn}',
			'${budget?.status}',
			${budget?.durationInDays}
		)`

		this.#db.query(sql);

		this.#db.query(sql2);

		this.#db.query(sql3);

		this.#db.query(sql4);

		return Promise.resolve(undefined)
	}

	update(patient: Patient): Promise<void> {
		const hospitalization = patient.openHospitalization();

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

		this.#db.query(sql);

		const sql2 = `
            UPDATE patients SET status = '${PatientStatus.HOSPITALIZED}'
            WHERE patient_id = '${patient.patientId.getValue()}'
        `;

		this.#db.query(sql2);

		return Promise.resolve(undefined);

	}

	hospitalized(): Promise<Patient[]> {
		const sql = `
			SELECT hospitalizations.status as h_status, * FROM hospitalizations
			JOIN patients ON hospitalizations.patient_id = patients.patient_id
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE patients.status = '${PatientStatus.HOSPITALIZED}'
		`;
		const rows = this.#db.queryEntries(sql);

		const patients: Patient[] = [];

		rows.forEach((row) => {
			this.#buildPatients(patients, row)
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
			this.#buildPatients(patients, row)
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

	#buildPatients(patients: Patient[], row: RowObject) {

		const patient = patients.find((patient) => patient.patientId.getValue() === row.patient_id);
			
		if (patient) {
			const hospitalizationData = factory.composeHospitalizationsData(row);
			const hospitalization = Hospitalization.compose(hospitalizationData);
			patient.hospitalizations.push(hospitalization);
			return;
		}

		if (!patient) {
			const patientData = factory.composePatientData(row);
			const ownerData = factory.composeOwnerData(row);
			const hospitalizationData = factory.composeHospitalizationsData(row);
			const hospitalization = Hospitalization.compose(hospitalizationData);
			const patient = Patient.compose(patientData, ownerData);
			patient.hospitalizations.push(hospitalization);
			patients.push(patient);
		}
	}
}
