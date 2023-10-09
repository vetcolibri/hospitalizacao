import { ID } from "../../domain/id.ts";
import { Patient } from "../../domain/patients/patient.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";

export class PatientRepositoryStub implements PatientRepository {
	readonly #data: Record<string, Patient> = {};

	constructor() {
		this.#populate();
	}

	hospitalized(): Promise<Patient[]> {
		const patients = this.records;
		return Promise.resolve(patients);
	}

	save(patient: Patient): Promise<void> {
		const id = patient.patientId.toString();
		this.#data[id] = patient;
		return Promise.resolve(undefined);
	}

	get(patientId: ID): Promise<Patient> {
		const id = patientId.toString();
		return Promise.resolve(this.#data[id]);
	}

	#populate() {
		const patient1 = new Patient("some-id");
		this.save(patient1);
	}

	get records(): Patient[] {
		return Object.values(this.#data);
	}
}
