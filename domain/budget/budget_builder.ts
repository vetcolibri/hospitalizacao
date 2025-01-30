import { Budget } from "domain/budget/budget.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class BudgetBuilder {
	#hospitalizationId?: ID;
	#startOn?: string;
	#endOn?: string;
	#status?: string;

	withHospitalizationId(id: string): BudgetBuilder {
		this.#hospitalizationId = ID.fromString(id);
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
			ID.random(),
			this.#hospitalizationId,
			this.#startOn,
			this.#endOn,
			this.#status,
		);

		return right(budget);
	}
}
