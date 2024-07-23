import { DB } from "deps";
import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { EntityFactory } from "shared/factory.ts";
import { ID } from "shared/id.ts";

const factory = new EntityFactory();

export class SQLiteBudgetRepository implements BudgetRepository {
	#db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	get(hospitalizationId: ID): Promise<Either<BudgetNotFound, Budget>> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM budgets WHERE hospitalization_id = :hospitalizationId LIMIT 1",
			{
				hospitalizationId: hospitalizationId.value,
			},
		);

		if (rows.length === 0) return Promise.resolve(left(new BudgetNotFound()));

		const budget = factory.createBudget(rows[0]);

		return Promise.resolve(right(budget));
	}

	getAll(): Promise<Budget[]> {
		const rows = this.#db.queryEntries("SELECT * FROM budgets");

		const budgets = rows.map((row) => factory.createBudget(row));

		return Promise.resolve(budgets);
	}

	save(budget: Budget): Promise<void> {
		this.#db.queryEntries(
			"INSERT INTO budgets (hospitalization_id, start_on, end_on, status, budget_id) VALUES (:hospitalizationId, :startOn, :endOn, :status, :budgetId)",
			{
				hospitalizationId: budget.hospitalizationId.value,
				startOn: budget.startOn.toISOString(),
				endOn: budget.endOn.toISOString(),
				status: budget.status,
				budgetId: budget.budgetId,
			},
		);

		return Promise.resolve(undefined);
	}

	update(budget: Budget): Promise<void> {
		this.#db.queryEntries("UPDATE budgets SET status = :status WHERE budget_id = :budgetId", {
			status: budget.status,
			budgetId: budget.budgetId,
		});

		return Promise.resolve(undefined);
	}

	last(): Promise<Budget> {
		const rows = this.#db.queryEntries("SELECT * FROM budgets");

		const hospitalization = factory.createBudget(rows[rows.length - 1]);

		return Promise.resolve(hospitalization);
	}
}
