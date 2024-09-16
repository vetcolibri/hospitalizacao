import { Client } from "deps";
import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class PostgresBudgetRepository implements BudgetRepository {
	constructor(private client: Client) {}

	async get(budgetId: ID): Promise<Either<BudgetNotFound, Budget>> {
		const result = await this.client.queryObject<BudgetModel>(
			"SELECT * FROM budgets WHERE budget_id = $BUDGET_ID LIMIT 1",
			{
				budget_id: budgetId.value,
			},
		);

		if (result.rows.length === 0) return left(new BudgetNotFound());

		return right(budgetFactory(result.rows[0]));
	}

	async findById(hospitalizationId: ID): Promise<Either<BudgetNotFound, Budget>> {
		const result = await this.client.queryObject<BudgetModel>(
			"SELECT * FROM budgets WHERE hospitalization_id = $HOSPITALIZATION_ID LIMIT 1",
			{
				hospitalization_id: hospitalizationId.value,
			},
		);

		if (result.rows.length === 0) return left(new BudgetNotFound());

		return right(budgetFactory(result.rows[0]));
	}

	async getAll(): Promise<Budget[]> {
		const result = await this.client.queryObject<BudgetModel>("SELECT * FROM budgets");
		return result.rows.map(budgetFactory);
	}

	async save(budget: Budget): Promise<void> {
		const query =
			`INSERT INTO budgets (hospitalization_id, start_on, end_on, status, budget_id) VALUES ($1, $2, $3, $4 $5)`;

		await this.client.queryObject(query, [
			budget.hospitalizationId.value,
			budget.startOn.toISOString(),
			budget.endOn.toISOString(),
			budget.status,
			budget.budgetId.value,
		]);
	}

	async update(budget: Budget): Promise<void> {
		const query =
			"UPDATE budgets SET status = $STATUS, start_on = $START_ON, end_on = $END_ON  WHERE budget_id = $BUDGET_ID";
		await this.client.queryObject(
			query,
			{
				status: budget.status,
				budget_id: budget.budgetId.value,
				start_on: budget.startOn.toISOString(),
				end_on: budget.endOn.toISOString(),
			},
		);
	}

	async last(): Promise<Budget> {
		const result = await this.client.queryObject<BudgetModel>("SELECT * FROM budgets");
		return budgetFactory(result.rows[result.rows.length - 1]);
	}
}

interface BudgetModel {
	hospitalization_id: string;
	budget_id: string;
	start_on: string;
	end_on: string;
	status: string;
}

function budgetFactory(model: BudgetModel): Budget {
	return Budget.restore({
		hospitalizationId: model.hospitalization_id,
		budgetId: model.budget_id,
		startOn: model.start_on,
		endOn: model.end_on,
		status: model.status,
	});
}
