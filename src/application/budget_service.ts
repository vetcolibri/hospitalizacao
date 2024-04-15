import { Budget } from "domain/patients/hospitalizations/budget.ts";
import { BudgetRepository } from "../domain/patients/hospitalizations/budget_repository.ts";

export class BudgetService {
	#budgetRepository: BudgetRepository;

	constructor(budgetRepository: BudgetRepository) {
		this.#budgetRepository = budgetRepository;
	}

	async getAll(): Promise<Budget[]> {
		return await this.#budgetRepository.getAll();
	}
}
