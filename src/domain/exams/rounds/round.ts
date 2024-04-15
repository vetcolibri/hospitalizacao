import { ID } from "shared/id.ts";
import { Parameter } from "../parameters/parameter.ts";

export class Round {
	readonly #roundId: ID;
	readonly #patientId: ID;
	readonly parameters: Parameter[];

	constructor(patientId: ID) {
		this.#roundId = ID.random();
		this.#patientId = patientId;
		this.parameters = [];
	}

	addParameter(parameter: Parameter): void {
		this.parameters.push(parameter);
	}

	getParameter(name: string) {
		return this.parameters.find((parameter) => parameter.name === name);
	}

	totalParameters(): number {
		return this.parameters.length;
	}

	get roundId(): ID {
		return this.#roundId;
	}

	get patientId(): ID {
		return this.#patientId;
	}
}
