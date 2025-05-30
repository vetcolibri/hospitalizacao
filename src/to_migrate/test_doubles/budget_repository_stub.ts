import { InmemBudgetRepository } from "@infra/persistence/inmem/inmem_budget_repository.ts";
import { Budget } from "@domain/budget/budget.ts";
import { ID } from "@shared/id.ts";

export class BudgetRepositoryStub extends InmemBudgetRepository {
	constructor() {
		super(Object.values(BUDGETS));
	}
}

const BUDGETS = [
	new Budget(ID.random(), ID.fromString("0001"), "2024-04-10", "2024-04-20", "NÃO PAGO"),
	new Budget(ID.random(), ID.fromString("0002"), "2024-04-10", "2024-04-20", "NÃO PAGO"),
	new Budget(ID.random(), ID.fromString("0003"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(
		ID.random(),
		ID.fromString("0004"),
		"2024-04-10",
		"2024-04-20",
		"PENDENTE (ORÇAMENTO ENVIADO)",
	),
	new Budget(ID.random(), ID.fromString("0005"), "2024-04-10", "2024-04-20", "PAGO"),
	new Budget(ID.random(), ID.fromString("0006"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(ID.random(), ID.fromString("0007"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(ID.random(), ID.fromString("0008"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(ID.random(), ID.fromString("0009"), "2024-04-10", "2024-04-20", "PENDENTE"),
];
