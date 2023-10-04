import { Round } from "./round.ts";

export interface RoundRepository {
	save(round: Round): Promise<void>;
	last(): Promise<Round>;
}
