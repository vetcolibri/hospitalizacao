import { assertEquals } from "dev_deps";
import { Budget } from "domain/budget/budget.ts";
import { ID } from "shared/id.ts";
import { BudgetService } from "application/budget_service.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";

Deno.test("Budget Service - Deve recuperar os budgets", async (t) => {
	await t.step("Deve recuperar o orçamento pelo ID da hospitalização", async () => {
		const budgetRepository = new InmemBudgetRepository();
		await budgetRepository.save(budget);
		const service = new BudgetService(budgetRepository);

		const budgets = await service.getAll();

		assertEquals(budgets.length, 1);
	});

	await t.step("Deve retornar uma lista vazia se não existir orçamentos", async () => {
		const budgetRepository = new InmemBudgetRepository();
		const service = new BudgetService(budgetRepository);

		const budgets = await service.getAll();

		assertEquals(budgets, []);
	});
});

const budget = new Budget(ID.random().value, "2024-04-10", "2024-04-15", "PENDENTE");
