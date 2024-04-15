import { Budget } from "../../domain/patients/hospitalizations/budget.ts";
import { BudgetRepository } from "../../domain/patients/hospitalizations/budget_repository.ts";
import { DB } from "../../../deps.ts";
import { EntityFactory } from "shared/factory.ts";

const factory = new EntityFactory();

export class SQLiteBudgetRepository implements BudgetRepository {
	#db: DB;

	constructor(db: DB) {
		this.#db = db;
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

	last(): Promise<Budget> {
		const rows = this.#db.queryEntries("SELECT * FROM budgets");

		const hospitalization = factory.createBudget(rows[rows.length - 1]);

		return Promise.resolve(hospitalization);
	}
}
