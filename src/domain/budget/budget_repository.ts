import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface BudgetRepository {
	findAll(): Promise<Budget[]>;
	findById(id: ID): Promise<Either<BudgetNotFound, Budget>>;
	findByHospitalizationId(id: ID): Promise<Either<BudgetNotFound, Budget>>;
	save(budget: Budget): Promise<void>;
	update(budget: Budget): Promise<void>;
	last(): Promise<Budget>;
}
