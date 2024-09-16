import { Client } from "deps";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

interface PatientModel {
	system_id: string;
	patient_id: string;
	name: string;
	breed: string;
	specie: string;
	birth_date: string;
	owner_id: string;
	status: string;
}

function patientFactory(model: PatientModel): Patient {
	return Patient.restore({
		systemId: model.system_id,
		patientId: model.patient_id,
		name: model.name,
		breed: model.breed,
		specie: model.specie,
		birthDate: model.birth_date,
		ownerId: model.owner_id,
		status: model.status,
	});
}

export class PostgresPatientRepository implements PatientRepository {
	constructor(private client: Client) {}

	async getById(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT * FROM patients WHERE system_id = $SYSTEM_ID limit 1",
			{ system_id: patientId.value },
		);

		if (result.rows.length === 0) return left(new PatientNotFound());

		return right(patientFactory(result.rows[0]));
	}

	async save(patient: Patient): Promise<void> {
		await this.client.queryObject(
			"INSERT INTO patients (system_id, patient_id, name, breed, specie, birth_date, owner_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
			[
				patient.systemId.value,
				patient.patientId.value,
				patient.name,
				patient.breed,
				patient.specie,
				patient.birthDate.value.toISOString(),
				patient.ownerId.value,
				patient.status,
			],
		);
	}

	async update(patient: Patient): Promise<void> {
		await this.client.queryObject(
			"UPDATE patients SET status = $STATUS WHERE system_id = $SYSTEM_ID",
			{
				status: patient.status,
				system_id: patient.systemId.value,
			},
		);
	}

	async hospitalized(): Promise<Patient[]> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT * FROM patients WHERE status != $STATUS",
			{ status: PatientStatus.Discharged },
		);

		return result.rows.map(patientFactory);
	}

	async nonHospitalized(): Promise<Patient[]> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT * FROM patients WHERE status = $STATUS",
			{ status: PatientStatus.Discharged },
		);

		return result.rows.map(patientFactory);
	}

	last(): Promise<Patient> {
		throw new Error("Method not implemented.");
	}

	async exists(patientId: ID): Promise<boolean> {
		const result = await this.client.queryObject<PatientModel>(
			"SELECT patient_id FROM patients WHERE patient_id = $PATIENT_ID",
			{ patient_id: patientId.value },
		);

		return result.rows.some((row) => row.patient_id === patientId.value);
	}
}
