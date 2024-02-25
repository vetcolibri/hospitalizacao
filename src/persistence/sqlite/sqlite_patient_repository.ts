import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { Either, left, right } from "shared/either.ts";
import { EntityFactory } from "shared/factory.ts";
import { ID } from "shared/id.ts";
import { DB, RowObject } from "deps";
import { Owner } from "domain/patients/owner.ts";
import { OwnerNotFound } from "domain/patients/owner_not_found_error.ts";
import { Hospitalization } from "domain/patients/hospitalization.ts";

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
			WHERE patients.patient_id = '${patientId.value}'
			LIMIT 1
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
    const owner = await this.findOwner(patient.owner.ownerId);
    if (owner.isLeft()) {
      this.#insertOwner(patient.owner);
    }

    const sql = `INSERT INTO patients (
			patient_id,
			name,
			breed,
			specie,
			birth_date,
			owner_id,
			status
		) VALUES (
			'${patient.patientId.value}',
			'${patient.name}',
			'${patient.breed}',
			'${patient.specie}',
			'${patient.birthDate.value.toISOString()}',
			'${patient.owner.ownerId.value}',
			'${patient.status}'
		)`;

    this.#db.query(sql);

    this.#insertHospitalization(patient);

    return Promise.resolve(undefined);
  }

  update(patient: Patient): Promise<void> {
    this.#insertHospitalization(patient);

    const sql2 = `
            UPDATE patients SET status = '${PatientStatus.HOSPITALIZED}'
            WHERE patient_id = '${patient.patientId.value}'
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
            WHERE patient_id = '${patientId.value}'
        `;
    const rows = this.#db.queryEntries(query);

    const exists = rows.some((row) => row.patient_id === patientId.value);

    return Promise.resolve(exists);
  }

  findOwner(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
    const sql = `SELECT * FROM owners WHERE owner_id = '${ownerId.value}' LIMIT 1`;
    const rows = this.#db.queryEntries(sql);

    if (rows.length === 0) return Promise.resolve(left(new OwnerNotFound()));

    const owner = factory.createOwner(rows[0]);

    return Promise.resolve(right(owner));
  }

  #insertOwner(owner: Owner) {
    const sql = `INSERT INTO owners (
			owner_id,
			owner_name,
			phone_number
		) VALUES (
			'${owner.ownerId.value}',
			'${owner.name}',
			'${owner.phoneNumber}'
		)`;

    this.#db.query(sql);
  }

  #insertHospitalization(patient: Patient) {
    const hospitalization = patient.openHospitalization();
    const sql = `INSERT INTO hospitalizations (
			hospitalization_id,
			patient_id,
			weight,
			entry_date,
			discharge_date,
			complaints,
			diagnostics,
			status
		) VALUES (
			'${hospitalization?.hospitalizationId.value}',
			'${patient.patientId.value}',
			${hospitalization?.weight},
			'${hospitalization?.entryDate}',
			'${hospitalization?.dischargeDate}',
			'${JSON.stringify(hospitalization?.complaints.join(","))}',
			'${JSON.stringify(hospitalization?.diagnostics.join(","))}',
			'${hospitalization?.status}'
		)`;

    this.#db.query(sql);

    this.#inserBudget(hospitalization!);
  }

  #inserBudget(hospitalization: Hospitalization) {
    const budget = hospitalization.activeBudget();
    const sql = `INSERT INTO budgets (
			budget_id,
			hospitalization_id,
			start_on,
			end_on,
			status,
			days
		) VALUES (
			'${budget?.budgetId.value}',
			'${hospitalization?.hospitalizationId.value}',
			'${budget?.startOn.toISOString()}',
			'${budget?.endOn.toISOString()}',
			'${budget?.status}',
			${budget?.durationInDays}
		)`;

    this.#db.query(sql);
  }

  #buildPatients(patients: Patient[], row: RowObject) {
    const patient = patients.find(
      (patient) => patient.patientId.value === row.patient_id
    );

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
