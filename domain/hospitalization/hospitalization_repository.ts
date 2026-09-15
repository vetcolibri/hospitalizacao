import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface HospitalizationRepository {
	findByPatientId(patientId: ID): Promise<Either<HospitalizationNotFound, Hospitalization>>;
	/**
	 * Todas as hospitalizações abertas do doente. Devolve a lista completa para
	 * que o chamador possa detectar ambiguidade em vez de escolher um episódio.
	 */
	findOpenByPatientId(patientId: ID): Promise<Hospitalization[]>;
	findByStatus(status: HospitalizationStatus): Promise<Hospitalization[]>;
	save(hospitalization: Hospitalization): Promise<void>;
	update(hospitalization: Hospitalization): Promise<void>;
	last(): Promise<Hospitalization>;
}
