import { Round } from "domain/hospitalization/rounds/round.ts";

export interface RoundRepository {
	save(round: Round): Promise<void>;
	last(): Promise<Round>;
}
