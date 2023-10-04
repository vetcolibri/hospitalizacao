import { Patient } from "./patient.ts";

export interface PatientRepository {
	get(patientId: string): Promise<Patient>;
}
