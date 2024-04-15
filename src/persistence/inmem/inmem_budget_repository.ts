import { Budget } from "../../domain/patients/hospitalizations/budget.ts";
import { BudgetRepository } from "../../domain/patients/hospitalizations/budget_repository.ts";

export class InmemBudgetRepository implements BudgetRepository {
	#budgets: Record<string, Budget> = {};

	getAll(): Promise<Budget[]> {
		return Promise.resolve(this.records);
	}

	save(budget: Budget): Promise<void> {
		this.#budgets[budget.budgetId] = budget;
		return Promise.resolve();
	}

	last(): Promise<Budget> {
		return Promise.resolve(this.records[this.records.length - 1]);
	}

	get records(): Budget[] {
		return Object.values(this.#budgets);
	}
}
