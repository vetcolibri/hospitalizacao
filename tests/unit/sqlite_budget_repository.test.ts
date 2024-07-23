import { assertEquals } from "dev_deps";
import { Budget, BudgetStatus } from "domain/budget/budget.ts";
import { SQLiteBudgetRepository } from "persistence/sqlite/sqlite_budget_repository.ts";
import { ID } from "shared/id.ts";
import { budgetData } from "../fake_data.ts";
import { init_test_db, populate } from "./test_db.ts";

Deno.test("SQLite - Budget Repository", async (t) => {
	await t.step("Deve salvar o orçamento", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteBudgetRepository(db);

		const newBudget = new Budget(
			"some-hospitalization-id",
			"2024-04-09",
			"2024-04-19",
			BudgetStatus.Pending,
		);

		await repository.save(newBudget);

		const budget = await repository.last();

		assertEquals(budget.hospitalizationId.value, "some-hospitalization-id");
		assertEquals(budget.startOn.toISOString(), "2024-04-09T00:00:00.000Z");
		assertEquals(budget.endOn.toISOString(), "2024-04-19T00:00:00.000Z");
		assertEquals(budget.status, BudgetStatus.Pending);
	});

	await t.step("Deve recuperar o Orçamento com base na hospitalização", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteBudgetRepository(db);

		const budgetOrErr = await repository.get(
			ID.fromString("some-hospitalization-id"),
		);

		const budget = <Budget> budgetOrErr.value;

		assertEquals(budget.hospitalizationId.value, "some-hospitalization-id");
		assertEquals(budget.startOn.toISOString(), budgetData.startOn);
		assertEquals(budget.endOn.toISOString(), budgetData.endOn);
	});

	await t.step("Deve atualizar o orçamento", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteBudgetRepository(db);

		const budgetOrErr = await repository.get(
			ID.fromString("some-hospitalization-id"),
		);

		const budget = <Budget> budgetOrErr.value;

		budget.changeStatus(BudgetStatus.Paid);

		await repository.update(budget);

		const updatedBudgetOrErr = await repository.get(
			ID.fromString("some-hospitalization-id"),
		);

		const updatedBudget = <Budget> updatedBudgetOrErr.value;

		assertEquals(updatedBudget.status, BudgetStatus.Paid);
	});
});
