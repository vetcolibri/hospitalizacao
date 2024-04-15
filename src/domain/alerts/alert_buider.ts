import { Alert } from "domain/alerts/alert.ts";
import { ID } from "shared/id.ts";
import { Either, left, right } from "shared/either.ts";
import { InvalidRepeatEvery } from "domain/alerts/repeat_every_error.ts";
import { RepeatEvery } from "domain/alerts/repeat_every.ts";

export class AlertBuider {
	#patientId?: ID;
	#parameters?: string[];
	#repeatEvery?: RepeatEvery;
	#time?: Date;
	#comments?: string;

	withPatientId(patientId: ID): AlertBuider {
		this.#patientId = patientId;
		return this;
	}

	withParameters(parameters: string[]): AlertBuider {
		this.#parameters = parameters;
		return this;
	}

	withReapetEvery(seconds: number): AlertBuider {
		this.#repeatEvery = new RepeatEvery(seconds);
		return this;
	}

	withTime(time: string): AlertBuider {
		this.#time = new Date(time);
		return this;
	}

	withComments(comments: string): AlertBuider {
		this.#comments = comments;
		return this;
	}

	build(): Either<Error, Alert> {
		if (!this.#patientId) throw new Error("Patient ID is required.");

		if (!this.#parameters) throw new Error("Parameters are required.");

		if (!this.#repeatEvery) throw new Error("Rate is required.");

		if (!this.#time) throw new Error("Time is required.");

		if (!this.#comments) throw new Error("Comments are required.");

		if (!this.#repeatEvery.isValid()) return left(new InvalidRepeatEvery());

		const alert = new Alert(
			ID.random(),
			this.#patientId,
			this.#parameters,
			this.#time,
			this.#repeatEvery,
			this.#comments,
		);

		return right(alert);
	}
}
