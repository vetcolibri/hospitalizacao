import { assertEquals, assertInstanceOf } from "dev_deps";
import { HospitalizationHistoryService } from "application/hospitalization_history_service.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HeartRate } from "domain/hospitalization/parameters/heart_rate.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationLinkDiagnostic } from "persistence/inmem/inmem_hospitalization_link_diagnostic.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemReportRepository } from "persistence/inmem/inmem_report_repository.ts";
import { InmemRoundRepository } from "persistence/inmem/inmem_round_repository.ts";
import { Budget } from "domain/budget/budget.ts";
import { ID } from "shared/id.ts";

/**
 * RF-15 — o histórico é lido SEMPRE por `hospitalization_id` e nunca mistura
 * episódios do mesmo paciente. Os dados legados por classificar (hospitalization_id
 * a NULL) não podem aparecer em nenhum episódio: a classificação é manual.
 */

const PATIENT_A = "sys-A";
const PATIENT_B = "sys-B";
const OWNER_ID = "own-1";

function makePatient(systemId: string, ownerId: string): Patient {
	return Patient.restore({
		systemId,
		patientId: `PID-${systemId}`,
		name: `Paciente ${systemId}`,
		specie: "CANINO",
		breed: "SRD",
		birthDate: "2020-01-01",
		ownerId,
		status: PatientStatus.Hospitalized,
	});
}

function makeHospitalization(
	hospitalizationId: string,
	systemId: string,
	entryDate: string,
	status: HospitalizationStatus,
	dischargeDate?: string,
	contact?: { name: string; phoneNumber: string; whatsapp: boolean },
): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId,
		patientId: systemId,
		weight: 10,
		complaints: ["Queixa"],
		diagnostics: ["Diagnostico"],
		entryDate,
		dischargeDate,
		status,
		contact,
	});
}

function makeRound(systemId: string, hospitalizationId: string, value: number, issuedAt: string) {
	const round = new Round(ID.fromString(systemId), ID.fromString(hospitalizationId));
	const heartRate = HeartRate.compose(value, issuedAt);
	round.add(heartRate);
	return round;
}

function makeReport(
	reportId: string,
	systemId: string,
	hospitalizationId: string,
	comments: string,
	createdAt: string,
): Report {
	return new Report(
		ID.fromString(reportId),
		ID.fromString(systemId),
		ID.fromString(hospitalizationId),
		["Alerta"],
		new Food(["Ração"], "1", createdAt),
		[],
		comments,
		new Date(createdAt),
	);
}

interface Fixture {
	service: HospitalizationHistoryService;
}

function makeFixture(): Fixture {
	const hospitalizations = new InmemHospitalizationRepository([
		makeHospitalization(
			"h1",
			PATIENT_A,
			"2026-03-01T08:00:00.000Z",
			HospitalizationStatus.Close,
			"2026-03-05T08:00:00.000Z",
			{
				name: "Contacto h1",
				phoneNumber: "923456789",
				whatsapp: true,
			},
		),
		makeHospitalization(
			"h2",
			PATIENT_A,
			"2026-03-01T08:00:00.000Z",
			HospitalizationStatus.Open,
		),
		makeHospitalization(
			"h4",
			PATIENT_A,
			"2026-02-01T08:00:00.000Z",
			HospitalizationStatus.Close,
			"2026-02-04T08:00:00.000Z",
		),
		makeHospitalization(
			"h3",
			PATIENT_A,
			"2026-01-01T08:00:00.000Z",
			HospitalizationStatus.Close,
			"2026-01-04T08:00:00.000Z",
		),
		makeHospitalization(
			"hb1",
			PATIENT_B,
			"2026-03-02T08:00:00.000Z",
			HospitalizationStatus.Open,
		),
	]);

	const budgets = new InmemBudgetRepository([
		new Budget(
			ID.fromString("budget-h1"),
			ID.fromString("h1"),
			"2026-03-01",
			"2026-03-05",
			"PAGO",
		),
		new Budget(
			ID.fromString("budget-h2"),
			ID.fromString("h2"),
			"2026-03-01",
			"2026-03-06",
			"NÃO PAGO",
		),
		new Budget(
			ID.fromString("budget-hb1"),
			ID.fromString("hb1"),
			"2026-03-02",
			"2026-03-06",
			"PAGO",
		),
	]);

	const rounds = new InmemRoundRepository([
		makeRound(PATIENT_A, "h1", 101, "2026-03-02T09:00:00.000Z"),
		makeRound(PATIENT_A, "h2", 202, "2026-03-02T10:00:00.000Z"),
		makeRound(PATIENT_B, "hb1", 303, "2026-03-02T11:00:00.000Z"),
	]);

	const reports = new InmemReportRepository([
		makeReport("rep-h1", PATIENT_A, "h1", "Relatório do h1", "2026-03-02T09:30:00.000Z"),
		makeReport("rep-h2", PATIENT_A, "h2", "Relatório do h2", "2026-03-02T10:30:00.000Z"),
		makeReport("rep-hb1", PATIENT_B, "hb1", "Relatório do hb1", "2026-03-02T11:30:00.000Z"),
	]);

	const patients = new InmemPatientRepository([
		makePatient(PATIENT_A, OWNER_ID),
		makePatient(PATIENT_B, OWNER_ID),
	]);
	const owners = new InmemOwnerRepository();
	owners.save(new Owner(OWNER_ID, "Tutor Principal", "933000111", true));

	const diagnostic = new InmemHospitalizationLinkDiagnostic({
		[PATIENT_A]: {
			reportsWithoutHospitalization: 1154,
			roundsWithoutHospitalization: 503,
		},
	});

	const service = new HospitalizationHistoryService(
		hospitalizations,
		budgets,
		rounds,
		reports,
		patients,
		owners,
		diagnostic,
	);

	return { service };
}

Deno.test("RF-15 - histórico: listagem", async (t) => {
	await t.step("ordena por entrada descendente e desempata pelo id descendente", async () => {
		const { service } = makeFixture();

		const list = await service.listByPatient(PATIENT_A);
		const ids = list.map((item) => item.hospitalizationId);

		assertEquals(ids, ["h2", "h1", "h4", "h3"]);
	});

	await t.step("inclui episódios abertos e encerrados", async () => {
		const { service } = makeFixture();

		const list = await service.listByPatient(PATIENT_A);
		const statuses = list.map((item) => item.status);

		assertEquals(statuses.includes(HospitalizationStatus.Open), true);
		assertEquals(statuses.includes(HospitalizationStatus.Close), true);
	});

	await t.step("devolve apenas os episódios do paciente pedido", async () => {
		const { service } = makeFixture();

		const list = await service.listByPatient(PATIENT_A);
		const ids = list.map((item) => item.hospitalizationId);

		assertEquals(ids.includes("hb1"), false);
	});

	await t.step("paciente sem histórico devolve lista vazia", async () => {
		const { service } = makeFixture();

		assertEquals(await service.listByPatient("sem-historico"), []);
	});
});

Deno.test("RF-15 - histórico: detalhe isolado por episódio", async (t) => {
	await t.step("devolve o orçamento, rondas e relatórios SÓ desse episódio", async () => {
		const { service } = makeFixture();

		const detailOrErr = await service.detail(PATIENT_A, "h1");
		assertEquals(detailOrErr.isRight(), true);

		const detail = detailOrErr.value;
		assertEquals(detail.budget?.budgetId.value, "budget-h1");
		assertEquals(detail.rounds.length, 1);
		assertEquals(detail.rounds[0].parameters[0].value, 101);
		assertEquals(detail.reports.map((r) => r.reportId.value), ["rep-h1"]);
	});

	await t.step("não devolve dados do outro episódio do mesmo paciente", async () => {
		const { service } = makeFixture();

		const detail = (await service.detail(PATIENT_A, "h2")).value;

		assertEquals(detail.budget?.budgetId.value, "budget-h2");
		assertEquals(detail.rounds.map((r) => r.parameters[0].value), [202]);
		assertEquals(detail.reports.map((r) => r.reportId.value), ["rep-h2"]);
	});

	await t.step("episódio encerrado continua consultável", async () => {
		const { service } = makeFixture();

		const detailOrErr = await service.detail(PATIENT_A, "h4");
		assertEquals(detailOrErr.isRight(), true);
		assertEquals(detailOrErr.value.hospitalization.status, HospitalizationStatus.Close);
	});

	await t.step("resolve o contacto efectivo: excepção do episódio", async () => {
		const { service } = makeFixture();

		const detail = (await service.detail(PATIENT_A, "h1")).value;

		assertEquals(detail.contactIsSpecific, true);
		assertEquals(detail.contact?.name, "Contacto h1");
		assertEquals(detail.contact?.phoneNumber, "923456789");
	});

	await t.step("resolve o contacto efectivo: tutor principal sem excepção", async () => {
		const { service } = makeFixture();

		const detail = (await service.detail(PATIENT_A, "h2")).value;

		assertEquals(detail.contactIsSpecific, false);
		assertEquals(detail.contact?.name, "Tutor Principal");
		assertEquals(detail.contact?.phoneNumber, "933000111");
	});
});

Deno.test("RF-15 - histórico: ownership", async (t) => {
	await t.step(
		"episódio de outro paciente devolve @HospitalizationNotFound sem revelar existência",
		async () => {
			const { service } = makeFixture();

			const result = await service.detail(PATIENT_B, "h1");

			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, HospitalizationNotFound);
		},
	);

	await t.step("episódio inexistente devolve @HospitalizationNotFound", async () => {
		const { service } = makeFixture();

		const result = await service.detail(PATIENT_A, "nao-existe");

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, HospitalizationNotFound);
	});
});

Deno.test("RF-15 - histórico: diagnóstico do legado pendente", async (t) => {
	await t.step("expõe os totais do paciente por classificar, sem os atribuir", async () => {
		const { service } = makeFixture();

		const status = await service.linkStatus(PATIENT_A);

		assertEquals(status.reportsWithoutHospitalization, 1154);
		assertEquals(status.roundsWithoutHospitalization, 503);
	});

	await t.step("pendências de um paciente não aparecem no outro paciente", async () => {
		const { service } = makeFixture();

		const status = await service.linkStatus(PATIENT_B);

		assertEquals(status.reportsWithoutHospitalization, 0);
		assertEquals(status.roundsWithoutHospitalization, 0);
	});
});
