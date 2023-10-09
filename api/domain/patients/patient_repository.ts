import { ID } from "../id.ts";
import { Patient } from "./patient.ts";

export interface PatientRepository {
	get(patientId: ID): Promise<Patient>;
	hospitalized(): Promise<Patient[]>;
	save(patient: Patient): Promise<void>;
}
