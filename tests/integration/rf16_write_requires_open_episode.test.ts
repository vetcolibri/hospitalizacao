import { assertEquals, assertInstanceOf, assertSpyCalls, spy } from "dev_deps";
import { PatientService } from "application/patient_service.ts";
import { Budget, BudgetStatus } from "domain/budget/budget.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { MultipleOpenHospitalizations } from "domain/hospitalization/multiple_open_hospitalizations_error.ts";
import { Patient } from "domain/patient/patient.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * RF-16 — os encerramentos (hospitalização e orçamento) só podem agir sobre a
 * ÚNICA hospitalização aberta do paciente. Com zero ou duas abertas, e ao tentar
 * tocar num episódio que não é o aberto, a operação é recusada sem alterar nada.
 *
 * Estas escritas usam o mesmo bloqueio transaccional por paciente que a abertura
 * (SELECT ... FOR UPDATE em Postgres), para que dois pedidos concorrentes não
 * encerrem episódios ao acaso.
 */

const RECEPTION = "reception1";
const PATIENT_ID = "9001RF";

function hospitalizedPatient(): Patient {
	return new Patient(
		ID.fromString(PATIENT_ID),
		"RF16-CLINIC",
		"Rex RF16",
		"CANINO",
		"bulldog",
		"2013-07-01",
		"owner-rf16",
	);
}

function openHospitalization(id: string): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId: id,
		patientId: PATIENT_ID,
		weight: 12,
		complaints: ["Queixa"],
		diagnostics: ["Diagnostico"],
		entryDate: "2026-01-01T08:00:00.000Z",
		status: HospitalizationStatus.Open,
	});
}

function closedHospitalization(id: string): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId: id,
		patientId: PATIENT_ID,
		weight: 12,
		complaints: ["Queixa"],
		diagnostics: ["Diagnostico"],
		entryDate: "2026-01-01T08:00:00.000Z",
		dischargeDate: "2026-01-05T08:00:00.000Z",
		status: HospitalizationStatus.Close,
	});
}

function makeService(options: {
	hospitalizations: Hospitalization[];
	budgets?: Budget[];
	patient?: Patient;
}) {
	const patientRepository = new InmemPatientRepository([
		options.patient ?? hospitalizedPatient(),
	]);
	const hospitalizationRepository = new InmemHospitalizationRepository(
		options.hospitalizations,
	);
	const budgetRepository = new InmemBudgetRepository(options.budgets ?? []);

	const service = new PatientService(
		patientRepository,
		new InmemOwnerRepository(),
		hospitalizationRepository,
		budgetRepository,
		new InmemAlertRepository(),
		new InmemUserRepository([new User(RECEPTION, RECEPTION, Role.Reception)]),
		new AlertNotifierDummy(),
	);

	return { service, patientRepository, hospitalizationRepository, budgetRepository };
}

function openStatuses(hospitalizationRepository: InmemHospitalizationRepository): string[] {
	return hospitalizationRepository.records
		.filter((h) => h.isOpen())
		.map((h) => h.hospitalizationId.value)
		.sort();
}

Deno.test("RF-16 - encerrar hospitalização exige exactamente uma aberta", async (t) => {
	await t.step("com duas abertas recusa e não encerra nenhuma", async () => {
		const { service, hospitalizationRepository } = makeService({
			hospitalizations: [openHospitalization("h1"), openHospitalization("h2")],
		});

		const result = await service.endHospitalization(PATIENT_ID, RECEPTION);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, MultipleOpenHospitalizations);
		assertEquals(openStatuses(hospitalizationRepository), ["h1", "h2"]);
	});

	await t.step("sem nenhuma aberta devolve @HospitalizationNotFound", async () => {
		const { service } = makeService({ hospitalizations: [closedHospitalization("h1")] });

		const result = await service.endHospitalization(PATIENT_ID, RECEPTION);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, HospitalizationNotFound);
	});

	await t.step("com uma só aberta encerra essa e bloqueia o paciente", async () => {
		const { service, hospitalizationRepository, patientRepository } = makeService({
			hospitalizations: [openHospitalization("h1")],
			budgets: [new Budget(ID.fromString("b1"), ID.fromString("h1"), "2026-01-01", "2026-01-10", "PAGO")],
		});
		const lockSpy = spy(patientRepository, "lockBySystemId");

		const result = await service.endHospitalization(PATIENT_ID, RECEPTION);

		assertEquals(result.isRight(), true);
		assertEquals(openStatuses(hospitalizationRepository), []);
		assertSpyCalls(lockSpy, 1);
	});
});

Deno.test("RF-16 - encerrar orçamento exige exactamente uma aberta", async (t) => {
	await t.step("com duas abertas recusa e não altera o orçamento", async () => {
		const budget = new Budget(ID.fromString("b1"), ID.fromString("h1"), "2026-01-01", "2026-01-10", "NÃO PAGO");
		const { service, budgetRepository, patientRepository } = makeService({
			hospitalizations: [openHospitalization("h1"), openHospitalization("h2")],
			budgets: [budget],
		});
		const updateSpy = spy(budgetRepository, "update");
		const patientSpy = spy(patientRepository, "update");

		const result = await service.endBudget(PATIENT_ID, "h1", "PAGO", RECEPTION);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, MultipleOpenHospitalizations);
		assertSpyCalls(updateSpy, 0);
		assertSpyCalls(patientSpy, 0);
	});

	await t.step("sem nenhuma aberta recusa o orçamento do episódio encerrado", async () => {
		const budget = new Budget(ID.fromString("b1"), ID.fromString("h1"), "2026-01-01", "2026-01-10", "NÃO PAGO");
		const { service, budgetRepository } = makeService({
			hospitalizations: [closedHospitalization("h1")],
			budgets: [budget],
		});
		const updateSpy = spy(budgetRepository, "update");

		const result = await service.endBudget(PATIENT_ID, "h1", "PAGO", RECEPTION);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, HospitalizationNotFound);
		assertSpyCalls(updateSpy, 0);
	});

	await t.step("com uma aberta, um episódio diferente é recusado", async () => {
		const budget = new Budget(ID.fromString("b1"), ID.fromString("h0"), "2026-01-01", "2026-01-10", "NÃO PAGO");
		const { service, budgetRepository, patientRepository } = makeService({
			hospitalizations: [openHospitalization("h1"), closedHospitalization("h0")],
			budgets: [budget],
		});
		const updateSpy = spy(budgetRepository, "update");
		const patientSpy = spy(patientRepository, "update");

		const result = await service.endBudget(PATIENT_ID, "h0", "PAGO", RECEPTION);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, HospitalizationNotFound);
		assertSpyCalls(updateSpy, 0);
		assertSpyCalls(patientSpy, 0);
	});

	await t.step("com uma aberta correspondente actualiza o orçamento e bloqueia o paciente", async () => {
		const budget = new Budget(ID.fromString("b1"), ID.fromString("h1"), "2026-01-01", "2026-01-10", "NÃO PAGO");
		const { service, budgetRepository, patientRepository } = makeService({
			hospitalizations: [openHospitalization("h1")],
			budgets: [budget],
		});
		const lockSpy = spy(patientRepository, "lockBySystemId");

		const result = await service.endBudget(PATIENT_ID, "h1", "PAGO", RECEPTION);

		assertEquals(result.isRight(), true);
		assertSpyCalls(lockSpy, 1);

		const budgetOrErr = await budgetRepository.findByHospitalizationId(ID.fromString("h1"));
		assertEquals(budgetOrErr.isRight(), true);
		assertEquals((<Budget> budgetOrErr.value).status, BudgetStatus.Paid);
	});
});
