import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { HospitalizationAlreadyClosed } from "./hospitalization_already_closed_error.ts";
import { Hospitalization } from "./hospitalization.ts";

export interface HospitalizationRepository {
	getAllOpened(): Promise<Hospitalization[]>;
	open(patientId: ID): Promise<Either<HospitalizationAlreadyClosed, Hospitalization>>;
	save(hospitalization: Hospitalization): Promise<void>;
	update(hospitalization: Hospitalization): Promise<void>;
	last(): Promise<Hospitalization>;
}
