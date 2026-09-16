import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientSearchResult } from "domain/patient/patient_search_result.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface PatientRepository {
	findBySystemId(id: ID): Promise<Either<PatientNotFound, Patient>>;
	findByPatientId(id: ID): Promise<Either<PatientNotFound, Patient>>;
	findByStatus(status: PatientStatus): Promise<Patient[]>;
	findNonHospitalized(): Promise<Patient[]>;
	/**
	 * Pesquisa unificada por ID/nome do paciente e ID/nome do tutor, com
	 * relevância exacto > prefixo > parcial e limite de resultados. O termo é
	 * literal (`%` e `_` não são wildcards) e `limit` evita carregar a tabela.
	 */
	search(term: string, limit: number): Promise<PatientSearchResult[]>;
	lockBySystemId(id: ID): Promise<void>;
	save(patient: Patient): Promise<void>;
	update(patient: Patient): Promise<void>;
	last(): Promise<Patient>;
}
