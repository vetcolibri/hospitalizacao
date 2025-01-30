import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class InmemPatientRepository implements PatientRepository {
	readonly #data: Record<string, Patient> = {};

	constructor(patients?: Patient[]) {
		if (!patients) return;

		patients.forEach((p) => this.#data[p.systemId.value] = p);
	}

	findBySystemId(id: ID): Promise<Either<PatientNotFound, Patient>> {
		const patient = this.records.find((p) => p.systemId.equals(id));
		if (!patient) return Promise.resolve(left(new PatientNotFound()));
		return Promise.resolve(right(patient));
	}

	findByPatientId(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const patient = this.records.find((p) => p.patientId.equals(patientId));
		if (!patient) return Promise.resolve(left(new PatientNotFound()))
		return Promise.resolve(right(patient));
	}

	findByStatus(status: PatientStatus): Promise<Patient[]> {
	   return Promise.resolve(this.records.filter((p) => p.status === status))
	}

	save(patient: Patient): Promise<void> {
		this.#data[patient.systemId.value] = patient;
		return Promise.resolve(undefined);
	}

	update(patient: Patient): Promise<void> {
		this.#data[patient.systemId.value] = patient;
		return Promise.resolve(undefined);
	}

	last(): Promise<Patient> {
		const last = this.records[this.records.length - 1];
		return Promise.resolve(last);
	}

	get records(): Patient[] {
		return Object.values(this.#data);
	}
}
