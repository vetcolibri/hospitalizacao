import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class InmemBudgetRepository implements BudgetRepository {
	#budgets: Record<string, Budget> = {};

	constructor(budgets: Budget[] = []) {
		budgets.forEach((b) => this.#budgets[b.budgetId] = b);
	}

	getAll(): Promise<Budget[]> {
		return Promise.resolve(this.records);
	}

	get(hospitalizationId: ID): Promise<Either<BudgetNotFound, Budget>> {
		const budget = this.records.find((b) => b.hospitalizationId.equals(hospitalizationId));
		if (!budget) return Promise.resolve(left(new BudgetNotFound()));
		return Promise.resolve(right(budget));
	}

	save(budget: Budget): Promise<void> {
		this.#budgets[budget.budgetId] = budget;
		return Promise.resolve(undefined);
	}

	update(budget: Budget): Promise<void> {
		this.#budgets[budget.budgetId] = budget;
		return Promise.resolve(undefined);
	}

	last(): Promise<Budget> {
		return Promise.resolve(this.records[this.records.length - 1]);
	}

	get records(): Budget[] {
		return Object.values(this.#budgets);
	}
}
