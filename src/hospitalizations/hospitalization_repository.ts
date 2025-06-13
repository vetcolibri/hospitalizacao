import { Either } from "@shared/either.ts";
import { IdValue } from "@shared/id_value.ts";
import { Hospitalization } from "./hospitalization.ts";
import { HospitalizationNotFoundError } from "./hospitalization_not_found_error.ts";

export interface HospitalizationRepository {
	exists(id: IdValue): Promise<boolean>;
	findById(id: IdValue): Promise<Either<HospitalizationNotFoundError, Hospitalization>>;
	findByPetId(petId: IdValue): Promise<Hospitalization[]>;
	findActiveByPetId(petId: IdValue): Promise<Either<HospitalizationNotFoundError, Hospitalization>>;
	findActiveHospitalizations(): Promise<Hospitalization[]>;
	save(hospitalization: Hospitalization): Promise<void>;
	update(hospitalization: Hospitalization): Promise<void>;
	remove(hospitalization: Hospitalization): Promise<Either<HospitalizationNotFoundError, void>>;
}
