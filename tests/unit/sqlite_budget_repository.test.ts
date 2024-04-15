import { Budget } from "../../src/domain/patients/hospitalizations/budget.ts";
import { init_test_db } from "./test_db.ts";
import { BudgetStatus } from "domain/patients/hospitalizations/budget.ts";
import { populate } from "./test_db.ts";
import { assertEquals } from "dev_deps";
import { SQLiteBudgetRepository } from "../../src/persistence/sqlite/sqlite_budget_repository.ts";

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
});
