import { BUDGETS } from "../fake_data.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";

export class BudgetRepositoryStub extends InmemBudgetRepository {
	constructor() {
		super(Object.values(BUDGETS));
	}
}
