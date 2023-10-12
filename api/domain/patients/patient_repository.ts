import { ID } from "../id.ts";
import { Patient } from "./patient.ts";
import { PatientNotFound } from "./patient_not_found_error.ts";
import { Either } from "../../shared/either.ts";

export interface PatientRepository {
	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>>;
	hospitalized(): Promise<Patient[]>;
	save(patient: Patient): Promise<void>;
	update(patient: Patient): Promise<void>;
}
