import { Patient } from "../../domain/patients/patient.ts";

export class PatientRepositoryStub {
	readonly #data: Record<string, Patient> = {};

	get(patientId: string): Promise<Patient> {
		return Promise.resolve(new Patient(patientId));
	}
}
