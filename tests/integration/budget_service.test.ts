import { BudgetService } from "application/budget_service.ts";
import { assertEquals, assertInstanceOf } from "dev_deps";
import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { ID } from "shared/id.ts";

Deno.test("Budget Service - Get All", async (t) => {
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

Deno.test("Budget Service - Update", async (t) => {
	await t.step("Deve atualizar as datas de inicio e fim do orçamento", async () => {
		const budgetRepository = new InmemBudgetRepository();
		await budgetRepository.save(budget);
		const service = new BudgetService(budgetRepository);
		const data = {
			startOn: "2024-04-20",
			endOn: "2024-04-29",
		};

		await service.update("1010", data);

		const resOrErr = await budgetRepository.get(ID.fromString("1010"));

		const updatedBudget = <Budget> resOrErr.value;

		assertEquals(updatedBudget.startOn, new Date(data.startOn));
		assertEquals(updatedBudget.endOn, new Date(data.endOn));
	});

	await t.step("Deve retornar um @BudgetNotFound se o orçamento não existir", async () => {
		const budgetRepository = new InmemBudgetRepository();
		const service = new BudgetService(budgetRepository);
		const data = {
			startOn: "2024-04-20",
			endOn: "2024-04-29",
		};

		const resOrErr = await service.update("1010", data);

		assertEquals(resOrErr.isLeft(), true);
		assertInstanceOf(resOrErr.value, BudgetNotFound);
	});
});

const budget = new Budget(
	ID.fromString("1010"),
	ID.fromString("2020"),
	"2024-04-10",
	"2024-04-15",
	"PENDENTE",
);
