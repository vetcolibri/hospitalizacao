import { ID } from "../../domain/id.ts";
import { Parameter, PARAMETER_NAMES } from "../../domain/parameters/parameter.ts";
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

	latestMeasurements(patientId: ID): Promise<Parameter[]> {
		const rounds = this.#rounds.filter((round) =>
			round.patient.patientId.toString() === patientId.toString()
		);
		const parameters: Parameter[] = [];
		for (const round of rounds) {
			for (const parameter of round.parameters) {
				parameters.push(parameter);
			}
		}
		const result = [];
		for (const name of Object.values(PARAMETER_NAMES)) {
			console.log(name);
			const lastMeasurement = parameters.findLast((parameter) => parameter.name === name);
			if (lastMeasurement) {
				result.push(lastMeasurement);
			}
		}

		return Promise.resolve(result);
	}
}
