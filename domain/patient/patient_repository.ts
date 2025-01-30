import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface PatientRepository {
	findBySystemId(id: ID): Promise<Either<PatientNotFound, Patient>>;
	findByPatientId(id: ID): Promise<Either<PatientNotFound, Patient>>;
	findByStatus(status: PatientStatus): Promise<Patient[]>;
	save(patient: Patient): Promise<void>;
	update(patient: Patient): Promise<void>;
	last(): Promise<Patient>;
}
