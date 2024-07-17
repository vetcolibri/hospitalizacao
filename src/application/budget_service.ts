import { Budget } from "domain/budget/budget.ts";
import { BudgetRepository } from "../domain/budget/budget_repository.ts";

export class BudgetService {
	#budgetRepository: BudgetRepository;

	constructor(budgetRepository: BudgetRepository) {
		this.#budgetRepository = budgetRepository;
	}

	async getAll(): Promise<Budget[]> {
		return await this.#budgetRepository.getAll();
	}
}
