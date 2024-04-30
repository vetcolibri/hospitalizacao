import { Budget } from "../../domain/patients/hospitalizations/budget.ts";
import { BudgetRepository } from "../../domain/patients/hospitalizations/budget_repository.ts";
import { ID } from "../../shared/id.ts";

export class InmemBudgetRepository implements BudgetRepository {
	#budgets: Record<string, Budget> = {};

	constructor(budgets: Budget[] = []) {
		budgets.forEach((b) => this.#budgets[b.budgetId] = b);
	}

	getAll(): Promise<Budget[]> {
		return Promise.resolve(this.records);
	}

	getByHospitalizationId(hospitalizationId: ID): Promise<Budget> {
		const budget = this.records.find((b) => b.hospitalizationId.equals(hospitalizationId))!;
		return Promise.resolve(budget);
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
