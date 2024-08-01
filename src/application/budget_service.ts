import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class BudgetService {
	#budgetRepository: BudgetRepository;

	constructor(budgetRepository: BudgetRepository) {
		this.#budgetRepository = budgetRepository;
	}

	async getAll(): Promise<Budget[]> {
		return await this.#budgetRepository.getAll();
	}

	async update(budgetId: string, data: BudgetData): Promise<Either<BudgetNotFound, void>> {
		const budgetOrErr = await this.#budgetRepository.get(ID.fromString(budgetId));

		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);

		budgetOrErr.value.update(data.startOn, data.endOn);

		await this.#budgetRepository.update(budgetOrErr.value);

		return right(undefined);
	}
}

type BudgetData = {
	startOn: string;
	endOn: string;
};
