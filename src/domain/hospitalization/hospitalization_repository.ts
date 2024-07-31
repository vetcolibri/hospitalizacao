import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface HospitalizationRepository {
	getByPatientId(patientId: ID): Promise<Either<HospitalizationNotFound, Hospitalization>>;
	getAll(): Promise<Hospitalization[]>;
	save(hospitalization: Hospitalization): Promise<void>;
	update(hospitalization: Hospitalization): Promise<void>;
	last(): Promise<Hospitalization>;
}
