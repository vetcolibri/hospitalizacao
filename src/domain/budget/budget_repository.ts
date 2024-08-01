import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface BudgetRepository {
	get(budgetId: ID): Promise<Either<BudgetNotFound, Budget>>;
	findById(hospitalizationId: ID): Promise<Either<BudgetNotFound, Budget>>;
	getAll(): Promise<Budget[]>;
	save(budget: Budget): Promise<void>;
	update(budget: Budget): Promise<void>;
	last(): Promise<Budget>;
}
