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
			JOIN patients ON hospitalizations.system_id = patients.system_id
			JOIN owners ON patients.owner_id = owners.owner_id
			WHERE patients.system_id = :systemId
			LIMIT 1
		`;

		const rows = this.#db.queryEntries(sql, { systemId: patientId.value });

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

		this.#db.query(
			"INSERT INTO patients (system_id, patient_id, name, breed, specie, birth_date, owner_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			[
				patient.systemId.value,
				patient.patientId.value,
				patient.name,
				patient.breed,
				patient.specie,
				patient.birthDate.value.toISOString(),
				patient.owner.ownerId.value,
				patient.status,
			],
		);

		this.#insertHospitalization(patient);

		return Promise.resolve(undefined);
	}

	update(patient: Patient): Promise<void> {
		this.#insertHospitalization(patient);

		const sql2 = `
            UPDATE patients SET status = '${PatientStatus.HOSPITALIZED}'
            WHERE system_id = '${patient.systemId.value}'
        `;

		this.#db.query(sql2);

		return Promise.resolve(undefined);
	}

	hospitalized(): Promise<Patient[]> {
		const rows = this.#db.queryEntries(
			"SELECT hospitalizations.status as h_status, budgets.status as b_status, * FROM hospitalizations JOIN budgets ON hospitalizations.hospitalization_id = budgets.hospitalization_id  JOIN patients ON hospitalizations.system_id = patients.system_id JOIN owners ON patients.owner_id = owners.owner_id WHERE patients.status = :status",
			{ status: PatientStatus.HOSPITALIZED },
		);

		const patients: Patient[] = [];

		rows.forEach((row) => {
			this.#buildPatients(patients, row);
		});

		return Promise.resolve(patients);
	}

	nonHospitalized(): Promise<Patient[]> {
		const rows = this.#db.queryEntries(
			"SELECT hospitalizations.status as h_status, * FROM hospitalizations JOIN patients ON hospitalizations.system_id = patients.system_id JOIN owners ON patients.owner_id = owners.owner_id WHERE patients.status = :status",
			{ status: PatientStatus.DISCHARGED },
		);

		const patients: Patient[] = [];

		rows.forEach((row) => {
			this.#buildPatients(patients, row);
		});

		return Promise.resolve(patients);
	}

	exists(patientId: ID): Promise<boolean> {
		const rows = this.#db.queryEntries(
			"SELECT patient_id FROM patients WHERE patient_id = :patientId",
			{ patientId: patientId.value },
		);

		const exists = rows.some((row) => row.patient_id === patientId.value);

		return Promise.resolve(exists);
	}

	findOwner(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
		const rows = this.#db.queryEntries("SELECT * FROM owners WHERE owner_id = :ownerId", {
			ownerId: ownerId.value,
		});

		if (rows.length === 0) return Promise.resolve(left(new OwnerNotFound()));

		const owner = factory.createOwner(rows[0]);

		return Promise.resolve(right(owner));
	}

	#insertOwner(owner: Owner) {
		this.#db.query("INSERT INTO owners (owner_id, owner_name, phone_number) VALUES (?, ?, ?)", [
			owner.ownerId.value,
			owner.name,
			owner.phoneNumber,
		]);
	}

	#insertHospitalization(patient: Patient) {
		const hospitalization = patient.openHospitalization();
		this.#db.query(
			"INSERT INTO hospitalizations (hospitalization_id, system_id, weight, entry_date, discharge_date, complaints, diagnostics, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			[
				hospitalization?.hospitalizationId.value,
				patient.systemId.value,
				hospitalization?.weight,
				hospitalization?.entryDate.toISOString(),
				hospitalization?.dischargeDate?.toISOString() ?? null,
				JSON.stringify(hospitalization?.complaints.join(",")),
				JSON.stringify(hospitalization?.diagnostics.join(",")),
				hospitalization?.status,
			],
		);

		this.#inserBudget(hospitalization!);
	}

	#inserBudget(hospitalization: Hospitalization) {
		const budget = hospitalization.activeBudget();

		this.#db.query(
			"INSERT INTO budgets (budget_id, hospitalization_id, start_on, end_on, status, days) VALUES (?, ?, ?, ?, ?, ?)",
			[
				budget?.budgetId.value,
				hospitalization?.hospitalizationId.value,
				budget?.startOn.toISOString(),
				budget?.endOn.toISOString(),
				budget?.status,
				budget?.durationInDays,
			],
		);
	}

	#buildPatients(patients: Patient[], row: RowObject) {
		const patient = patients.find((patient) => patient.systemId.value === row.system_id);

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
