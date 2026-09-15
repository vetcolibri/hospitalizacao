import { assertEquals } from "dev_deps";
import { Application } from "deps";
import type { HospitalizationHistoryService } from "application/hospitalization_history_service.ts";
import { Budget } from "domain/budget/budget.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HeartRate } from "domain/hospitalization/parameters/heart_rate.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import hospitalizationHistoryRouter from "infra/http/hospitalization_history_router.ts";
import { left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

/**
 * RF-15 — contrato HTTP da consulta de histórico. O detalhe expõe apenas os
 * dados do episódio (orçamento, rondas/exames, relatórios e contacto efectivo)
 * e devolve 404 quer para episódio inexistente quer para episódio de outro
 * paciente, sem revelar a existência.
 */

const HOSPITALIZATION_ID = "hosp-1";
const PATIENT_ID = "sys-1";

function buildHospitalization(): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId: HOSPITALIZATION_ID,
		patientId: PATIENT_ID,
		weight: 12.5,
		complaints: ["Anorexia"],
		diagnostics: ["Por definir"],
		entryDate: "2026-01-01T10:00:00.000Z",
		dischargeDate: "2026-01-10T10:00:00.000Z",
		status: HospitalizationStatus.Close,
	});
}

function buildRound(): Round {
	const round = new Round(
		ID.fromString(PATIENT_ID),
		ID.fromString(HOSPITALIZATION_ID),
		ID.fromString("round-1"),
	);
	round.add(HeartRate.compose(120, "2026-01-02T09:00:00.000Z"));
	return round;
}

function buildReport(): Report {
	return new Report(
		ID.fromString("report-1"),
		ID.fromString(PATIENT_ID),
		ID.fromString(HOSPITALIZATION_ID),
		["Alerta"],
		new Food(["Ração"], "1", "2026-01-02T09:30:00.000Z"),
		[],
		"Paciente estável",
		new Date("2026-01-02T09:30:00.000Z"),
	);
}

function makeService(overrides: Partial<HospitalizationHistoryService> = {}) {
	return {
		listByPatient: () =>
			Promise.resolve([
				{
					hospitalizationId: HOSPITALIZATION_ID,
					entryDate: new Date("2026-01-01T10:00:00.000Z"),
					dischargeDate: new Date("2026-01-10T10:00:00.000Z"),
					status: HospitalizationStatus.Close,
				},
			]),
		detail: () =>
			Promise.resolve(
				right({
					hospitalization: buildHospitalization(),
					budget: new Budget(
						ID.fromString("budget-1"),
						ID.fromString(HOSPITALIZATION_ID),
						"2026-01-01",
						"2026-01-10",
						"PAGO",
					),
					rounds: [buildRound()],
					reports: [buildReport()],
					contact: { name: "Tutor Principal", phoneNumber: "933000111", whatsapp: true },
					contactIsSpecific: false,
				}),
			),
		linkStatus: () =>
			Promise.resolve({
				reportsWithoutHospitalization: 1154,
				roundsWithoutHospitalization: 503,
			}),
		...overrides,
	} as unknown as HospitalizationHistoryService;
}

function makeApp(service: HospitalizationHistoryService): Application {
	const app = new Application();
	app.use(hospitalizationHistoryRouter(service).routes());
	return app;
}

Deno.test("RF-15 - histórico: listagem HTTP", async (t) => {
	await t.step("devolve o resumo com id, entrada, alta e estado", async () => {
		const app = makeApp(makeService());

		const response = await app.handle(
			new Request(`http://localhost/patients/${PATIENT_ID}/hospitalizations`),
		);
		const body = await response?.json();

		assertEquals(response?.status, 200);
		assertEquals(body[0].hospitalizationId, HOSPITALIZATION_ID);
		assertEquals(body[0].entryDate, "2026-01-01T10:00:00.000Z");
		assertEquals(body[0].dischargeDate, "2026-01-10T10:00:00.000Z");
		assertEquals(body[0].status, HospitalizationStatus.Close);
	});
});

Deno.test("RF-15 - histórico: detalhe HTTP", async (t) => {
	await t.step("expõe hospitalização, orçamento, rondas, relatórios e contacto", async () => {
		const app = makeApp(makeService());

		const response = await app.handle(
			new Request(
				`http://localhost/patients/${PATIENT_ID}/hospitalizations/${HOSPITALIZATION_ID}`,
			),
		);
		const body = await response?.json();

		assertEquals(response?.status, 200);
		assertEquals(body.hospitalization.hospitalizationId, HOSPITALIZATION_ID);
		assertEquals(body.budget.budgetId, "budget-1");
		assertEquals(body.rounds[0].roundId, "round-1");
		assertEquals(body.rounds[0].measurements[0].name, "heartRate");
		assertEquals(body.rounds[0].measurements[0].value, 120);
		assertEquals(body.reports[0].reportId, "report-1");
		assertEquals(body.contact.name, "Tutor Principal");
		assertEquals(body.contactIsSpecific, false);
	});

	await t.step("episódio inexistente é 404", async () => {
		const app = makeApp(
			makeService({ detail: () => Promise.resolve(left(new HospitalizationNotFound())) }),
		);

		const response = await app.handle(
			new Request(`http://localhost/patients/${PATIENT_ID}/hospitalizations/nao-existe`),
		);

		assertEquals(response?.status, 404);
	});

	await t.step("episódio de outro paciente é 404 sem revelar existência", async () => {
		const app = makeApp(
			makeService({ detail: () => Promise.resolve(left(new HospitalizationNotFound())) }),
		);

		const response = await app.handle(
			new Request(
				`http://localhost/patients/outro-paciente/hospitalizations/${HOSPITALIZATION_ID}`,
			),
		);

		assertEquals(response?.status, 404);
	});
});

Deno.test("RF-15 - histórico: diagnóstico do legado", async (t) => {
	await t.step("expõe os totais por classificar", async () => {
		const app = makeApp(makeService());

		const response = await app.handle(
			new Request("http://localhost/hospitalizations/legacy-link-status"),
		);
		const body = await response?.json();

		assertEquals(response?.status, 200);
		assertEquals(body.reportsWithoutHospitalization, 1154);
		assertEquals(body.roundsWithoutHospitalization, 503);
	});
});
