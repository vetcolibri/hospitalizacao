import { assertEquals, assertInstanceOf } from "dev_deps";
import { BudgetService } from "application/budget_service.ts";
import { Budget } from "domain/budget/budget.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotOpen } from "domain/hospitalization/hospitalization_not_open_error.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";

/**
 * RF-16 — editar as datas de um orçamento só é possível enquanto o episódio
 * estiver aberto. Num episódio encerrado a escrita é recusada e o orçamento
 * fica intacto.
 */

const MEDVET = "medvet1";
const PATIENT_ID = "9002RF";

function budgetFor(hospitalizationId: string): Budget {
	return new Budget(
		ID.fromString("b-" + hospitalizationId),
		ID.fromString(hospitalizationId),
		"2026-01-01",
		"2026-01-10",
		"PENDENTE",
	);
}

function hospitalization(id: string, status: HospitalizationStatus): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId: id,
		patientId: PATIENT_ID,
		weight: 12,
		complaints: ["Queixa"],
		diagnostics: ["Diagnostico"],
		entryDate: "2026-01-01T08:00:00.000Z",
		dischargeDate: status === HospitalizationStatus.Close ? "2026-01-05T08:00:00.000Z" : undefined,
		status,
	});
}

function makeService(budgets: Budget[], hospitalizations: Hospitalization[]) {
	const budgetRepository = new InmemBudgetRepository(budgets);

	const service = new BudgetService(
		budgetRepository,
		new InmemUserRepository([new User(MEDVET, MEDVET, Role.MedVet)]),
		new InmemHospitalizationRepository(hospitalizations),
	);

	return { service, budgetRepository };
}

Deno.test("RF-16 - orçamento de episódio encerrado é só de leitura", async (t) => {
	await t.step("recusa editar as datas e mantém o orçamento intacto", async () => {
		const { service, budgetRepository } = makeService(
			[budgetFor("h1")],
			[hospitalization("h1", HospitalizationStatus.Close)],
		);

		const result = await service.update(
			"b-h1",
			{ startOn: "2026-02-01", endOn: "2026-02-10" },
			MEDVET,
		);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, HospitalizationNotOpen);

		const budgetOrErr = await budgetRepository.findById(ID.fromString("b-h1"));
		assertEquals(budgetOrErr.isRight(), true);
		assertEquals((<Budget> budgetOrErr.value).startOn, new Date("2026-01-01"));
	});

	await t.step("permite editar as datas do episódio aberto", async () => {
		const { service, budgetRepository } = makeService(
			[budgetFor("h2")],
			[hospitalization("h2", HospitalizationStatus.Open)],
		);

		const result = await service.update(
			"b-h2",
			{ startOn: "2026-02-01", endOn: "2026-02-10" },
			MEDVET,
		);

		assertEquals(result.isRight(), true);

		const budgetOrErr = await budgetRepository.findById(ID.fromString("b-h2"));
		assertEquals((<Budget> budgetOrErr.value).startOn, new Date("2026-02-01"));
	});
});
