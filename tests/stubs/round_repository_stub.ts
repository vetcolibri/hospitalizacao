import { Round } from "domain/hospitalization/rounds/round.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";
import { ID } from "shared/id.ts";

export class RoundRepositoryStub implements RoundRepository {
	readonly #rounds: Round[] = [];

	constructor() {}

	save(round: Round): Promise<void> {
		this.#rounds.push(round);
		return Promise.resolve(undefined);
	}

	findAllByHospitalizationId(hospitalizationId: ID): Promise<Round[]> {
		return Promise.resolve(
			this.#rounds.filter((round) => round.hospitalizationId.equals(hospitalizationId)),
		);
	}

	last(): Promise<Round> {
		return Promise.resolve(this.#rounds[this.#rounds.length - 1]);
	}
}
