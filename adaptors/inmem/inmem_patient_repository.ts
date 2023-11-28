import { ID } from "../../domain/id.ts";
import { Owner } from "../../domain/patients/owner.ts";
import { OwnerNotFound } from "../../domain/patients/owner_not_found_error.ts";
import { Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { Either, left, right } from "../../shared/either.ts";

export class InmemPatientRepository implements PatientRepository {
	readonly #data: Record<string, Patient> = {};

	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const patient = this.records.find((patient) =>
			patient.patientId.getValue() === patientId.getValue()
		);
		if (!patient) return Promise.resolve(left(new PatientNotFound()));
		return Promise.resolve(right(patient));
	}

	hospitalized(): Promise<Patient[]> {
		const patients = this.records.filter((patient) =>
			patient.status === PatientStatus.HOSPITALIZED
		);
		return Promise.resolve(patients);
	}

	save(patient: Patient): Promise<void> {
		this.#data[patient.patientId.getValue()] = patient;
		return Promise.resolve(undefined);
	}

	saveWithOwner(patient: Patient): Promise<void> {
		this.save(patient);
		return Promise.resolve(undefined);
	}

	nonHospitalized(): Promise<Patient[]> {
		const patients = this.records.filter((patient) =>
			patient.status === PatientStatus.DISCHARGED
		);
		return Promise.resolve(patients);
	}

	update(patient: Patient): Promise<void> {
		const id = patient.patientId.getValue();
		this.#data[id] = patient;
		return Promise.resolve(undefined);
	}

	exists(patientId: ID): Promise<boolean> {
		const exists = this.records.some((patient) =>
			patient.patientId.getValue() === patientId.getValue()
		);
		return Promise.resolve(exists);
	}

	findOwner(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
		const patient = this.records.find((patient) =>
			patient.owner.ownerId.getValue() === ownerId.getValue()
		);

		if (!patient) return Promise.resolve(left(new OwnerNotFound()));
		const owner = patient.owner;
		return Promise.resolve(right(owner));
	}

	get records(): Patient[] {
		return Object.values(this.#data);
	}
}
