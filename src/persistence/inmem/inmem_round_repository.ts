import { ID } from "shared/id.ts";
import { Parameter, ParameterName } from "../../domain/hospitalization/parameters/parameter.ts";
import { Round } from "../../domain/hospitalization/rounds/round.ts";
import { RoundRepository } from "../../domain/hospitalization/rounds/round_repository.ts";

export class InmemRoundRepository implements RoundRepository {
	readonly #rounds: Round[] = [];

	save(round: Round): Promise<void> {
		this.#rounds.push(round);
		return Promise.resolve(undefined);
	}

	last(): Promise<Round> {
		return Promise.resolve(this.#rounds[this.#rounds.length - 1]);
	}

	measurements(patientId: ID): Promise<Parameter[]> {
		const rounds = this.#rounds.filter(
			(round) => round.patientId.value === patientId.value,
		);
		const parameters: Parameter[] = [];
		for (const round of rounds) {
			for (const parameter of round.parameters) {
				parameters.push(parameter);
			}
		}
		return Promise.resolve(parameters);
	}

	latestMeasurements(patientId: ID): Promise<Parameter[]> {
		const rounds = this.#rounds.filter(
			(round) => round.patientId.value === patientId.value,
		);
		const parameters: Parameter[] = [];
		for (const round of rounds) {
			for (const parameter of round.parameters) {
				parameters.push(parameter);
			}
		}
		const result = [];
		for (const name of Object.values(ParameterName)) {
			const lastMeasurement = parameters.findLast(
				(parameter) => parameter.name === name,
			);
			if (lastMeasurement) {
				result.push(lastMeasurement);
			}
		}

		return Promise.resolve(result);
	}
}
