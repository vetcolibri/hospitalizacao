import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { Either, left, right } from "shared/either.ts";
import { EntityFactory } from "shared/factory.ts";
import { ID } from "shared/id.ts";
import { DB } from "deps";

const factory = new EntityFactory();

export class SQLitePatientRepository implements PatientRepository {
	#db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM patients WHERE system_id = :systemId limit 1",
			{ systemId: patientId.value },
		);

		if (rows.length === 0) return Promise.resolve(left(new PatientNotFound()));

		const patient = factory.createPatient(rows[0]);

		return Promise.resolve(right(patient));
	}

	save(patient: Patient): Promise<void> {
		this.#db.queryEntries(
			"INSERT INTO patients (system_id, patient_id, name, breed, specie, birth_date, owner_id, status) VALUES (:systemId, :patientId, :name, :breed, :specie, :birthDate, :ownerId, :status)",
			{
				systemId: patient.systemId.value,
				patientId: patient.patientId.value,
				name: patient.name,
				breed: patient.breed,
				specie: patient.specie,
				birthDate: patient.birthDate.value.toISOString(),
				ownerId: patient.ownerId.value,
				status: patient.status,
			},
		);

		return Promise.resolve(undefined);
	}

	update(patient: Patient): Promise<void> {
		this.#db.queryEntries("UPDATE patients SET status = :status WHERE system_id = :systemId", {
			status: patient.status,
			systemId: patient.systemId.value,
		});

		return Promise.resolve(undefined);
	}

	hospitalized(): Promise<Patient[]> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM patients WHERE status = :status",
			{ status: PatientStatus.Hospitalized },
		);

		const patients = rows.map((row) => factory.createPatient(row));

		return Promise.resolve(patients);
	}

	nonHospitalized(): Promise<Patient[]> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM patients WHERE status = :status",
			{ status: PatientStatus.Discharged },
		);

		const patients = rows.map((row) => factory.createPatient(row));

		return Promise.resolve(patients);
	}

	last(): Promise<Patient> {
		throw new Error("Method not implemented.");
	}

	exists(patientId: ID): Promise<boolean> {
		const rows = this.#db.queryEntries(
			"SELECT patient_id FROM patients WHERE patient_id = :patientId",
			{ patientId: patientId.value },
		);

		const exists = rows.some((row) => row.patient_id === patientId.value);

		return Promise.resolve(exists);
	}
}
