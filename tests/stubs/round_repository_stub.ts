import { ID } from "shared/id.ts";
import { HeartRate } from "domain/parameters/heart_rate.ts";
import { Parameter, ParameterName } from "domain/parameters/parameter.ts";
import { Trc } from "domain/parameters/trc.ts";
import { Round } from "domain/rounds/round.ts";
import { RoundRepository } from "domain/rounds/round_repository.ts";
import { patient1 } from "../fake_data.ts";

export class RoundRepositoryStub implements RoundRepository {
	readonly #rounds: Round[] = [];

	constructor() {
		this.#populate();
	}

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

	#populate() {
		const heartRate = new HeartRate(78);
		const trc = new Trc("Maior que 2'");
		const round1 = new Round(patient1.patientId);
		const round2 = new Round(patient1.patientId);
		const round3 = new Round(patient1.patientId);
		round1.addParameter(heartRate);
		round2.addParameter(heartRate);
		round3.addParameter(trc);
		this.save(round1);
		this.save(round2);
		this.save(round3);
	}
}
