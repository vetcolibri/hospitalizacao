import { ID } from "shared/id.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";

export class InmemPatientRepository implements PatientRepository {
	readonly #data: Record<string, Patient> = {};

	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const patient = this.records.find((p) => p.systemId.equals(patientId));
		if (!patient) return Promise.resolve(left(new PatientNotFound()));
		return Promise.resolve(right(patient));
	}

	hospitalized(): Promise<Patient[]> {
		const patients = this.records.filter((p) => p.status === PatientStatus.Hospitalized);
		return Promise.resolve(patients);
	}

	save(patient: Patient): Promise<void> {
		this.#data[patient.systemId.value] = patient;
		return Promise.resolve(undefined);
	}

	nonHospitalized(): Promise<Patient[]> {
		const patients = this.records.filter((p) => p.status === PatientStatus.Discharged);
		return Promise.resolve(patients);
	}

	update(patient: Patient): Promise<void> {
		this.#data[patient.systemId.value] = patient;
		return Promise.resolve(undefined);
	}

	exists(patientId: ID): Promise<boolean> {
		const exists = this.records.some((p) => p.patientId.equals(patientId));
		return Promise.resolve(exists);
	}

	last(): Promise<Patient> {
		const last = this.records[this.records.length - 1];
		return Promise.resolve(last);
	}

	get records(): Patient[] {
		return Object.values(this.#data);
	}
}
