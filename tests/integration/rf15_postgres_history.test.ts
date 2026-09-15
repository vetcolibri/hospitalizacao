import { assertEquals, assertInstanceOf } from "dev_deps";
import { Client } from "deps";
import { HospitalizationHistoryService } from "application/hospitalization_history_service.ts";
import { HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { PostgresBudgetRepository } from "persistence/postgres/postgres_budget_repository.ts";
import { PostgresHospitalizationLinkDiagnostic } from "persistence/postgres/postgres_hospitalization_link_diagnostic.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { PostgresOwnerRepository } from "persistence/postgres/postgres_owner_repository.ts";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";
import { PostgresReportRepository } from "persistence/postgres/postgres_report_repository.ts";
import { PostgresRoundRepository } from "persistence/postgres/postgres_round_repository.ts";

/**
 * RF-15 contra o Postgres real: dois episódios do MESMO paciente, com orçamento,
 * rondas/exames e relatórios em ambos, provando que o detalhe de um episódio
 * nunca devolve dados do outro. O legado com `hospitalization_id` a NULL fica
 * de fora (classificação manual) e é apenas contado pelo diagnóstico.
 *
 * Requer a base de dados de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf15_postgres_history.test.ts
 */
const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON =
	"Define TEST_DATABASE_URL para correr os testes de transacção reais contra o Postgres.";

async function connect(): Promise<Client | undefined> {
	if (!DATABASE_URL) return undefined;

	const client = new Client(DATABASE_URL);
	try {
		await client.connect();
		await client.queryArray("SELECT 1");
		return client;
	} catch (error) {
		console.error("Não foi possível ligar ao Postgres de testes:", error);
		try {
			await client.end();
		} catch {
			// a ligação nunca chegou a ser estabelecida
		}
		return undefined;
	}
}

const probe = await connect();
const DB_AVAILABLE = probe !== undefined;
await probe?.end();

interface TestIds {
	systemId: string;
	patientId: string;
	ownerId: string;
	closedId: string;
	openId: string;
	legacyReportId: string;
	legacyRoundId: string;
	otherSystemId: string;
	otherPatientId: string;
	otherOwnerId: string;
}

let sequence = 0;

function makeTestIds(): TestIds {
	const unique = crypto.randomUUID().replaceAll("-", "").substring(0, 8);
	sequence++;

	return {
		systemId: `rf15h${unique}`,
		patientId: `RF15H-${sequence}-${unique}`,
		ownerId: `rf15ho${unique}`,
		closedId: `h1-${unique}`,
		openId: `h2-${unique}`,
		legacyReportId: `lr-${unique}`,
		legacyRoundId: `lg-${unique}`,
		otherSystemId: `rf15x${unique}`,
		otherPatientId: `RF15O-${sequence}-${unique}`,
		otherOwnerId: `rf15xo${unique}`,
	};
}

async function createOwnerAndPatient(
	client: Client,
	ownerId: string,
	systemId: string,
	patientId: string,
): Promise<void> {
	await client.queryObject(
		"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
		[ownerId, "Tutor Histórico", "933000111", true],
	);
	await client.queryObject(
		"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			systemId,
			patientId,
			"Rex Histórico",
			"CANINO",
			"bulldog",
			"ALTA MEDICA",
			"2013-07-01",
			ownerId,
		],
	);
}

async function seedEpisode(
	client: Client,
	ids: TestIds,
	hospitalizationId: string,
	entryDate: string,
	status: string,
	dischargeDate: string | null,
	budgetId: string,
	marker: number,
	reports: number,
): Promise<void> {
	await client.queryObject(
		"INSERT INTO hospitalizations (hospitalization_id, weight, complaints, diagnostics, entry_date, discharge_date, status, system_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			hospitalizationId,
			10 + marker,
			'"Queixa"',
			'"Diagnostico"',
			entryDate,
			dischargeDate,
			status,
			ids.systemId,
		],
	);
	await client.queryObject(
		"INSERT INTO budgets (budget_id, start_on, end_on, status, hospitalization_id) VALUES ($1, $2, $3, $4, $5)",
		[budgetId, entryDate, dischargeDate ?? entryDate, "PAGO", hospitalizationId],
	);

	const roundId = `r-${hospitalizationId}`;
	await client.queryObject(
		"INSERT INTO rounds (round_id, system_id, hospitalization_id) VALUES ($1, $2, $3)",
		[roundId, ids.systemId, hospitalizationId],
	);
	await client.queryObject(
		"INSERT INTO measurements (round_id, name, value, issued_at) VALUES ($1, $2, $3, $4)",
		[roundId, "heartRate", String(100 + marker), entryDate],
	);

	for (let i = 0; i < reports; i++) {
		const reportId = `rep-${hospitalizationId}-${i}`;
		await client.queryObject(
			`INSERT INTO reports (report_id, state_of_consciousness, food_types, food_level, food_date, created_at, comments, system_id, hospitalization_id)
			 VALUES ($1, '"alerta"', '"racao"', 'A', $2, $2, $3, $4, $5)`,
			[reportId, entryDate, `Relatorio ${marker}-${i}`, ids.systemId, hospitalizationId],
		);
		await client.queryObject(
			"INSERT INTO discharges (report_id, type, aspects) VALUES ($1, $2, $3)",
			[reportId, "Urina", '"Normal"'],
		);
	}
}

async function seedLegacy(client: Client, ids: TestIds): Promise<void> {
	// Legado por CLASSIFICAR: sem hospitalization_id. Não pode ser adivinhado.
	await client.queryObject(
		`INSERT INTO reports (report_id, state_of_consciousness, food_types, food_level, food_date, created_at, comments, system_id, hospitalization_id)
		 VALUES ($1, '"alerta"', '"racao"', 'A', '2026-05-01 10:00:00', '2026-05-01 10:00:00', 'legado por classificar', $2, NULL)`,
		[ids.legacyReportId, ids.systemId],
	);
	await client.queryObject(
		"INSERT INTO rounds (round_id, system_id, hospitalization_id) VALUES ($1, $2, NULL)",
		[ids.legacyRoundId, ids.systemId],
	);
}

async function deleteTestData(client: Client, ids: TestIds): Promise<void> {
	await client.queryObject(
		"DELETE FROM discharges WHERE report_id IN (SELECT report_id FROM reports WHERE system_id = $1)",
		[ids.systemId],
	);
	await client.queryObject(
		"DELETE FROM measurements WHERE round_id IN (SELECT round_id FROM rounds WHERE system_id = $1)",
		[
			ids.systemId,
		],
	);
	await client.queryObject("DELETE FROM reports WHERE system_id = $1", [ids.systemId]);
	await client.queryObject(
		"DELETE FROM budgets WHERE hospitalization_id IN (SELECT hospitalization_id FROM hospitalizations WHERE system_id = $1)",
		[ids.systemId],
	);
	await client.queryObject("DELETE FROM rounds WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM hospitalizations WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM patients WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM patients WHERE system_id = $1", [ids.otherSystemId]);
	await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [ids.ownerId]);
	await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [ids.otherOwnerId]);
}

function makeService(client: Client): HospitalizationHistoryService {
	return new HospitalizationHistoryService(
		new PostgresHospitalizationRepository(client),
		new PostgresBudgetRepository(client),
		new PostgresRoundRepository(client),
		new PostgresReportRepository(client),
		new PostgresPatientRepository(client),
		new PostgresOwnerRepository(client),
		new PostgresHospitalizationLinkDiagnostic(client),
	);
}

async function legacyCounts(client: Client): Promise<{ reports: number; rounds: number }> {
	const result = await client.queryObject<{ reports: number; rounds: number }>(
		`SELECT
			(SELECT count(*)::int FROM reports WHERE hospitalization_id IS NULL) AS reports,
			(SELECT count(*)::int FROM rounds WHERE hospitalization_id IS NULL) AS rounds`,
	);
	return result.rows[0];
}

function countQueries(client: Client): { count: () => number } {
	// deno-lint-ignore no-explicit-any
	const target = client as any;
	const original = target.queryObject.bind(client);
	let count = 0;
	target.queryObject = (...args: unknown[]) => {
		count++;
		return original(...args);
	};
	return { count: () => count };
}

Deno.test({
	name: "RF-15 - histórico real isola dois episódios do mesmo paciente",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			const before = await legacyCounts(admin);

			await createOwnerAndPatient(admin, ids.ownerId, ids.systemId, ids.patientId);
			await createOwnerAndPatient(
				admin,
				ids.otherOwnerId,
				ids.otherSystemId,
				ids.otherPatientId,
			);

			await seedEpisode(
				admin,
				ids,
				ids.closedId,
				"2026-01-01 08:00:00",
				HospitalizationStatus.Close,
				"2026-01-05 08:00:00",
				"budget-closed",
				1,
				5,
			);
			await seedEpisode(
				admin,
				ids,
				ids.openId,
				"2026-02-01 08:00:00",
				HospitalizationStatus.Open,
				null,
				"budget-open",
				2,
				5,
			);
			await seedLegacy(admin, ids);

			const service = makeService(client);

			const list = await service.listByPatient(ids.systemId);
			assertEquals(
				list.map((item) => item.hospitalizationId),
				[ids.openId, ids.closedId],
				"Ordenação entrada descendente; o legado não cria episódios.",
			);
			assertEquals(
				list.map((item) => item.status),
				[HospitalizationStatus.Open, HospitalizationStatus.Close],
			);

			const counters = countQueries(client);

			const closedOrErr = await service.detail(ids.systemId, ids.closedId);
			assertEquals(closedOrErr.isRight(), true);
			const closed = closedOrErr.value;

			assertEquals(closed.budget?.budgetId.value, "budget-closed");
			assertEquals(closed.rounds.length, 1);
			assertEquals(closed.rounds[0].parameters[0].value, 101);
			assertEquals(closed.rounds[0].hospitalizationId.value, ids.closedId);
			assertEquals(closed.reports.length, 5);
			assertEquals(
				closed.reports.every((report) => report.hospitalizationId.value === ids.closedId),
				true,
			);

			assertEquals(
				closed.reports.some((report) => report.comments.includes("legado")),
				false,
				"O legado com hospitalization_id a NULL não pertence a nenhum episódio.",
			);
			assertEquals(
				closed.reports.every((report) =>
					!report.reportId.value.startsWith("rep-" + ids.openId)
				),
				true,
				"Não pode haver relatórios do outro episódio.",
			);

			assertEquals(
				counters.count() <= 8,
				true,
				`O detalhe tem de usar um número limitado de queries, usou ${counters.count()}.`,
			);

			const open = (await service.detail(ids.systemId, ids.openId)).value;
			assertEquals(open.budget?.budgetId.value, "budget-open");
			assertEquals(open.rounds[0].parameters[0].value, 102);
			assertEquals(open.rounds[0].hospitalizationId.value, ids.openId);
			assertEquals(
				open.reports.every((report) => report.hospitalizationId.value === ids.openId),
				true,
			);

			const crossOrErr = await service.detail(ids.otherSystemId, ids.closedId);
			assertEquals(crossOrErr.isLeft(), true);
			assertInstanceOf(crossOrErr.value, HospitalizationNotFound);

			const status = await service.linkStatus();
			assertEquals(status.reportsWithoutHospitalization, before.reports + 1);
			assertEquals(status.roundsWithoutHospitalization, before.rounds + 1);
		} finally {
			if (admin) await deleteTestData(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});
