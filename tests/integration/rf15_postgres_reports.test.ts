import { assertEquals } from "dev_deps";
import { Application, Client } from "deps";
import { CrmService } from "application/crm_service.ts";
import { Role, User } from "domain/auth/user.ts";
import crmRouter from "infra/http/crm_router.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { PostgresBudgetRepository } from "persistence/postgres/postgres_budget_repository.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { PostgresOwnerRepository } from "persistence/postgres/postgres_owner_repository.ts";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";
import { PostgresReportRepository } from "persistence/postgres/postgres_report_repository.ts";
import { PostgresReportService } from "persistence/postgres/postgres_report_service.ts";
import { PostgresTransationController } from "persistence/postgres/postgres_transaction_controller.ts";

/**
 * RF-15 — o registo corrente de relatórios tem de funcionar contra a base de
 * dados real mesmo com centenas de relatórios históricos ainda por associar
 * (hospitalization_id a NULL), e tem de associar o relatório novo ao episódio
 * aberto correcto. Com dois episódios abertos recusa em vez de escolher um.
 *
 * Requer o link aditivo aplicado:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf15_postgres_reports.test.ts
 */
const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON =
	"Define TEST_DATABASE_URL para correr os testes de transacção reais contra o Postgres.";

const MEDVET = "medvet1";

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
	openId: string;
	secondOpenId: string;
	historicalId: string;
}

let sequence = 0;

function makeTestIds(): TestIds {
	const unique = crypto.randomUUID().replaceAll("-", "");
	sequence++;

	return {
		systemId: `rf15rep${unique}`,
		patientId: `RF15-${sequence}-${unique.substring(0, 12)}`,
		ownerId: `rf15repowner${unique}`,
		openId: `rf15openh${unique}`,
		secondOpenId: `rf15openh2${unique}`,
		historicalId: `rf15hist${unique}`,
	};
}

async function createTestPatient(client: Client, ids: TestIds): Promise<void> {
	await client.queryObject(
		"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
		[ids.ownerId, "Tutor RF15", "900000000", false],
	);
	await client.queryObject(
		"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			ids.systemId,
			ids.patientId,
			"Rex RF15",
			"CANINO",
			"bulldog",
			"HOSPITALIZADO",
			"2013-07-01",
			ids.ownerId,
		],
	);
	await client.queryObject(
		"INSERT INTO hospitalizations (hospitalization_id, weight, complaints, diagnostics, entry_date, status, system_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		[ids.openId, 10, '"Queixa 1"', '"Diagnostico 1"', "2026-04-01 08:00:00", "Aberta", ids.systemId],
	);
	// Relatório histórico por associar: coexiste com a operação corrente.
	await client.queryObject(
		`INSERT INTO reports (report_id, state_of_consciousness, food_types, food_level, food_date, created_at, comments, system_id, hospitalization_id)
		 VALUES ($1, '"alerta"', '"racao"', 'A', '2026-04-01 09:00:00', '2026-04-01 09:00:00', 'histórico', $2, NULL)`,
		[ids.historicalId, ids.systemId],
	);
}

async function deleteTestData(client: Client, ids: TestIds): Promise<void> {
	await client.queryObject(
		"DELETE FROM discharges WHERE report_id IN (SELECT report_id FROM reports WHERE system_id = $1)",
		[ids.systemId],
	);
	await client.queryObject("DELETE FROM reports WHERE system_id = $1", [ids.systemId]);
	await client.queryObject(
		"DELETE FROM budgets WHERE hospitalization_id IN (SELECT hospitalization_id FROM hospitalizations WHERE system_id = $1)",
		[ids.systemId],
	);
	await client.queryObject("DELETE FROM hospitalizations WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM patients WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [ids.ownerId]);
}

function makeApp(client: Client): Application {
	const service = new CrmService(
		new PostgresOwnerRepository(client),
		new PostgresPatientRepository(client),
		new PostgresHospitalizationRepository(client),
		new PostgresReportRepository(client),
		new PostgresBudgetRepository(client),
		new InmemUserRepository([new User(MEDVET, MEDVET, Role.MedVet)]),
		new PostgresReportService(client),
	);

	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = MEDVET;
		await next();
	});
	app.use(crmRouter(service, new PostgresTransationController(client)).routes());
	return app;
}

function registerReport(app: Application, ids: TestIds): Promise<Response | undefined> {
	return app.handle(
		new Request("http://localhost/owners/register-report", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				patientId: ids.systemId,
				stateOfConsciousness: ["Alerta"],
				food: { types: ["Ração"], level: "1", datetime: "2026-04-01T10:00:00" },
				discharges: [],
				comments: "Paciente estável",
			}),
		}),
	);
}

async function reportCount(client: Client, ids: TestIds): Promise<number> {
	const result = await client.queryObject<{ count: number }>(
		"SELECT count(*)::int AS count FROM reports WHERE system_id = $1",
		[ids.systemId],
	);
	return result.rows[0].count;
}

async function newReportHospitalization(
	client: Client,
	ids: TestIds,
): Promise<string | null> {
	const result = await client.queryObject<{ hospitalization_id: string | null }>(
		"SELECT hospitalization_id FROM reports WHERE system_id = $1 AND report_id <> $2",
		[ids.systemId, ids.historicalId],
	);
	return result.rows.length ? result.rows[0].hospitalization_id : null;
}

Deno.test({
	name: "RF-15 - registar relatório real com histórico NULL associa ao episódio aberto",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const response = await registerReport(makeApp(client), ids);
			assertEquals(response?.status, 200);

			assertEquals(await reportCount(admin, ids), 2, "O histórico mais o novo.");
			assertEquals(
				await newReportHospitalization(admin, ids),
				ids.openId,
				"O relatório novo tem de ficar associado ao episódio aberto.",
			);
			assertEquals(
				await admin.queryObject<{ id: string | null }>(
					"SELECT hospitalization_id AS id FROM reports WHERE report_id = $1",
					[ids.historicalId],
				).then((r) => r.rows[0].id),
				null,
				"O relatório histórico continua por associar.",
			);
		} finally {
			if (admin) await deleteTestData(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-15 - dois episódios abertos recusam o relatório sem gravar nenhum",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);
			await admin.queryObject(
				"INSERT INTO hospitalizations (hospitalization_id, weight, complaints, diagnostics, entry_date, status, system_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
				[ids.secondOpenId, 11, '"Queixa 1"', '"Diagnostico 1"', "2026-04-02 08:00:00", "Aberta", ids.systemId],
			);

			const response = await registerReport(makeApp(client), ids);
			assertEquals(response?.status, 400);

			assertEquals(
				await reportCount(admin, ids),
				1,
				"Apenas o relatório histórico; nenhum novo pode ser gravado.",
			);
		} finally {
			if (admin) await deleteTestData(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});
