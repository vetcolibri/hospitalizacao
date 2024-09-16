import { Round } from "domain/hospitalization/rounds/round.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";

export class RoundRepositoryStub implements RoundRepository {
	readonly #rounds: Round[] = [];

	constructor() {}

	save(round: Round): Promise<void> {
		this.#rounds.push(round);
		return Promise.resolve(undefined);
	}

	last(): Promise<Round> {
		return Promise.resolve(this.#rounds[this.#rounds.length - 1]);
	}
}
