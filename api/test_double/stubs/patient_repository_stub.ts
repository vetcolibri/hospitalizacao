import { ID } from "../../domain/id.ts";
import { Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { Either, left, right } from "../../shared/either.ts";

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

	update(patient: Patient): Promise<void> {
		const id = patient.patientId.toString();
		this.#data[id] = patient;
		return Promise.resolve(undefined);
	}

	#populate() {
		const patient1 = new Patient("some-id", "Rex");
		const data = {
			entryDate: "2023-10-16",
			dischargeDate: "2023-10-16",
			estimatedBudgetDate: "2023-10-16",
			weight: 16.5,
			age: 5,
			complaints: "Queixa 1",
			diagnostics: "Diagnostico 1",
		};
		patient1.hospitalize(
			data,
		);
		const patient2 = new Patient("some-patient-id", "Rex 2");
		this.save(patient1);
		this.save(patient2);
	}

	get records(): Patient[] {
		return Object.values(this.#data);
	}
}
