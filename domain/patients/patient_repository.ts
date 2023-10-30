import { ID } from "../id.ts";
import { Patient } from "./patient.ts";
import { PatientNotFound } from "./patient_not_found_error.ts";
import { Either } from "../../shared/either.ts";

export interface PatientRepository {
	hospitalized(): Promise<Patient[]>;
	nonHospitalized(): Promise<Either<Error, Patient[]>>;
	getById(patientId: ID): Promise<Either<PatientNotFound, Patient>>;
	save(patient: Patient): Promise<void>;
	update(patient: Patient): Promise<void>;
}
