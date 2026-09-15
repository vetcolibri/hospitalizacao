import { Round } from "domain/hospitalization/rounds/round.ts";
import { ID } from "shared/id.ts";

export interface RoundRepository {
	save(round: Round): Promise<void>;
	/**
	 * Rondas (com as respectivas medições) de UM episódio, filtradas
	 * directamente por `hospitalization_id`.
	 */
	findAllByHospitalizationId(hospitalizationId: ID): Promise<Round[]>;
	last(): Promise<Round>;
}
