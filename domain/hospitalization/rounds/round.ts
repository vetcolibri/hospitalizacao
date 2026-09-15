import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { ID } from "shared/id.ts";

export class Round {
	readonly #roundId: ID;
	readonly #patientId: ID;
	readonly #hospitalizationId: ID;
	readonly parameters: Parameter[];

	constructor(patientId: ID, hospitalizationId: ID) {
		this.#roundId = ID.random();
		this.#patientId = patientId;
		this.#hospitalizationId = hospitalizationId;
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

	get hospitalizationId(): ID {
		return this.#hospitalizationId;
	}
}
