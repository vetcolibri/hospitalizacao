import { ID } from "../../domain/id.ts";
import { Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { Either, left, right } from "../../shared/either.ts";
import { patient1, patient2, patient3, patient4 } from "../../tests/fake_data.ts";

export class PatientRepositoryStub implements PatientRepository {
	readonly #data: Record<string, Patient> = {};

	constructor() {
		this.#populate();
	}

	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>> {
		const patient = this.records.find((patient) =>
			patient.patientId.toString() === patientId.toString()
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
		const id = patient.patientId.toString();
		this.#data[id] = patient;
		return Promise.resolve(undefined);
	}

	nonHospitalized(): Promise<Patient[]> {
		const patients = this.records.filter((patient) =>
			patient.status === PatientStatus.NONHOSPITALIZED
		);
		return Promise.resolve(patients);
	}

	update(patient: Patient): Promise<void> {
		const id = patient.patientId.toString();
		this.#data[id] = patient;
		return Promise.resolve(undefined);
	}

	#populate() {
		this.save(patient1);
		this.save(patient2);
		this.save(patient3);
		this.save(patient4);
	}

	get records(): Patient[] {
		return Object.values(this.#data);
	}
}
