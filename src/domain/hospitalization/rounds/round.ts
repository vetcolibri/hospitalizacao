import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { ID } from "shared/id.ts";

export class Round {
	readonly #roundId: ID;
	readonly #patientId: ID;
	readonly parameters: Parameter[];

	constructor(patientId: ID) {
		this.#roundId = ID.random();
		this.#patientId = patientId;
		this.parameters = [];
	}

	add(parameter: Parameter): void {
		this.parameters.push(parameter);
	}

	get(name: string) {
		return this.parameters.find((parameter) => parameter.name === name);
	}

	total(): number {
		return this.parameters.length;
	}

	get roundId(): ID {
		return this.#roundId;
	}

	get patientId(): ID {
		return this.#patientId;
	}
}
