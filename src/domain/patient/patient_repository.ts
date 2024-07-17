import { PatientNotFound } from "./patient_not_found_error.ts";
import { Either } from "shared/either.ts";
import { Patient } from "./patient.ts";
import { ID } from "shared/id.ts";

export interface PatientRepository {
	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>>;
	save(patient: Patient): Promise<void>;
	update(patient: Patient): Promise<void>;
	exists(patientId: ID): Promise<boolean>;
	hospitalized(): Promise<Patient[]>;
	nonHospitalized(): Promise<Patient[]>;
	last(): Promise<Patient>;
}
