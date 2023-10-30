import { Round } from "../../domain/rounds/round.ts";
import { RoundRepository } from "../../domain/rounds/round_repository.ts";

export class InmemRoundRepository implements RoundRepository {
	readonly #rounds: Round[] = [];

	save(round: Round): Promise<void> {
		this.#rounds.push(round);
		return Promise.resolve(undefined);
	}

	last(): Promise<Round> {
		return Promise.resolve(this.#rounds[this.#rounds.length - 1]);
	}
}
