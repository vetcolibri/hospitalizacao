import { Budget } from "./budget.ts";

export interface BudgetRepository {
	getAll(): Promise<Budget[]>;
	save(budget: Budget): Promise<void>;
	last(): Promise<Budget>;
}
