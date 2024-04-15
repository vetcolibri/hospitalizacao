import { Budget } from "./budget.ts";
import { Either, left, right } from "shared/either.ts";

export class BudgetBuilder {
	#hospitalizationId?: string;
	#startOn?: string;
	#endOn?: string;
	#status?: string;

	withHospitalizationId(id: string): BudgetBuilder {
		this.#hospitalizationId = id;
		return this;
	}

	withStartOn(startOn: string): BudgetBuilder {
		this.#startOn = startOn;
		return this;
	}

	withEndOn(endOn: string): BudgetBuilder {
		this.#endOn = endOn;
		return this;
	}

	withStatus(status: string): BudgetBuilder {
		this.#status = status;
		return this;
	}

	build(): Either<Error, Budget> {
		if (!this.#hospitalizationId) return left(new Error("Hospitalization ID is required"));

		if (!this.#startOn) return left(new Error("Start date is required"));

		if (!this.#endOn) return left(new Error("End date is required"));

		if (!this.#status) return left(new Error("Status is required"));

		const budget = new Budget(
			this.#hospitalizationId,
			this.#startOn,
			this.#endOn,
			this.#status,
		);

		return right(budget);
	}
}
