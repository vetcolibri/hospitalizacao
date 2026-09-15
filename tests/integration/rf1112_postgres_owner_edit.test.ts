import { assertEquals } from "dev_deps";
import { Application, Client } from "deps";
import { PatientService } from "application/patient_service.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { PostgresBudgetRepository } from "persistence/postgres/postgres_budget_repository.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { PostgresOwnerRepository } from "persistence/postgres/postgres_owner_repository.ts";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";
import { PostgresTransationController } from "persistence/postgres/postgres_transaction_controller.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * Testes de transacção reais contra o Postgres da aplicação para a edição do tutor
 * (RF-11/RF-12) juntamente com a abertura de hospitalização + orçamento.
 *
 * Requerem a base de dados de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf1112_postgres_owner_edit.test.ts
 */
const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON =
	"Define TEST_DATABASE_URL para correr os testes de transacção reais contra o Postgres.";

const RECEPTION = "reception1";
const DISCHARGED = "ALTA MEDICA";

const HOSPITALIZATION_DATA = {
	weight: 16.5,
	entryDate: "2021-01-01",
	complaints: ["Queixa 1"],
	diagnostics: ["Diagnostico 1"],
};

const BUDGET_DATA = {
	startOn: "2021-01-01",
	endOn: "2021-01-10",
	status: "NÃO PAGO",
};

const OWNER_A = { name: "Tutor A", phoneNumber: "911111111", whatsapp: true };
const OWNER_B = { name: "Tutor B", phoneNumber: "922222222", whatsapp: false };

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
}

let sequence = 0;

function makeTestIds(): TestIds {
	const unique = crypto.randomUUID().replaceAll("-", "");
	sequence++;

	return {
		systemId: `rf1112trans${unique}`,
		patientId: `RF1112-${sequence}-${unique.substring(0, 12)}`,
		ownerId: `rf1112owner${unique}`,
	};
}

async function createTestPatient(client: Client, ids: TestIds): Promise<void> {
	await client.queryObject(
		"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
		[ids.ownerId, "Tutor Original", "900000000", false],
	);
	await client.queryObject(
		"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			ids.systemId,
			ids.patientId,
			"Rex RF1112",
			"CANINO",
			"bulldog",
			DISCHARGED,
			"2013-07-01",
			ids.ownerId,
		],
	);
}

async function deleteTestPatient(client: Client, ids: TestIds): Promise<void> {
	await client.queryObject(
		"DELETE FROM budgets WHERE hospitalization_id IN (SELECT hospitalization_id FROM hospitalizations WHERE system_id = $1)",
		[ids.systemId],
	);
	await client.queryObject("DELETE FROM hospitalizations WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM patients WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [ids.ownerId]);
}

interface Counts {
	hospitalizations: number;
	budgets: number;
	status: string;
}

async function readCounts(client: Client, ids: TestIds): Promise<Counts> {
	const hospitalizations = await client.queryObject<{ count: number }>(
		"SELECT count(*)::int AS count FROM hospitalizations WHERE system_id = $1",
		[ids.systemId],
	);
	const budgets = await client.queryObject<{ count: number }>(
		"SELECT count(*)::int AS count FROM budgets WHERE hospitalization_id IN (SELECT hospitalization_id FROM hospitalizations WHERE system_id = $1)",
		[ids.systemId],
	);
	const status = await client.queryObject<{ status: string }>(
		"SELECT status FROM patients WHERE system_id = $1",
		[ids.systemId],
	);

	return {
		hospitalizations: hospitalizations.rows[0].count,
		budgets: budgets.rows[0].count,
		status: status.rows[0].status,
	};
}

interface OwnerRow {
	name: string;
	phone_number: string;
	whatsapp: boolean;
}

async function readOwner(client: Client, ids: TestIds): Promise<OwnerRow> {
	const result = await client.queryObject<OwnerRow>(
		"SELECT name, phone_number, whatsapp FROM owners WHERE owner_id = $1",
		[ids.ownerId],
	);

	return result.rows[0];
}

function makeUserRepository() {
	return new InmemUserRepository([new User(RECEPTION, RECEPTION, Role.Reception)]);
}

class FailingPostgresBudgetRepository extends PostgresBudgetRepository {
	override save(): Promise<void> {
		return Promise.reject(new Error("falha ao guardar orçamento"));
	}
}

function makeApp(client: Client, budgetRepository?: PostgresBudgetRepository): Application {
	const service = new PatientService(
		new PostgresPatientRepository(client),
		new PostgresOwnerRepository(client),
		new PostgresHospitalizationRepository(client),
		budgetRepository ?? new PostgresBudgetRepository(client),
		new InmemAlertRepository(),
		makeUserRepository(),
		new AlertNotifierDummy(),
	);

	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = RECEPTION;
		await next();
	});
	app.use(
		patientsRouter(service, new PostgresTransationController(client)).routes(),
	);
	return app;
}

function hospitalize(
	app: Application,
	ids: TestIds,
	ownerData?: typeof OWNER_A,
): Promise<Response | undefined> {
	return app.handle(
		new Request("http://localhost/patients/hospitalize", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				patientId: ids.systemId,
				hospitalizationData: HOSPITALIZATION_DATA,
				budgetData: BUDGET_DATA,
				ownerData,
			}),
		}),
	);
}

Deno.test({
	name: "RF-11/RF-12 - edição do tutor, hospitalização e orçamento são gravados juntos",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const response = await hospitalize(makeApp(client), ids, OWNER_A);
			assertEquals(response?.status, 201);

			const owner = await readOwner(admin, ids);
			assertEquals(owner.name, OWNER_A.name, "O nome global do tutor tem de ser actualizado.");
			assertEquals(owner.phone_number, OWNER_A.phoneNumber);
			assertEquals(owner.whatsapp, OWNER_A.whatsapp);

			const counts = await readCounts(admin, ids);
			assertEquals(counts.hospitalizations, 1, "Deve criar uma hospitalização.");
			assertEquals(counts.budgets, 1, "Deve criar um orçamento.");
			assertEquals(counts.status, "HOSPITALIZADO");
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-11/RF-12 - falha ao guardar o orçamento desfaz também a edição do tutor",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const budgetRepository = new FailingPostgresBudgetRepository(client);
			const response = await hospitalize(makeApp(client, budgetRepository), ids, OWNER_B);
			assertEquals(response?.status, 500);

			const owner = await readOwner(admin, ids);
			assertEquals(owner.name, "Tutor Original", "O rollback tem de repor o tutor.");
			assertEquals(owner.phone_number, "900000000");
			assertEquals(owner.whatsapp, false);

			const counts = await readCounts(admin, ids);
			assertEquals(counts.hospitalizations, 0, "O rollback tem de remover a hospitalização.");
			assertEquals(counts.budgets, 0, "O rollback tem de remover o orçamento.");
			assertEquals(counts.status, DISCHARGED, "O paciente não pode ficar hospitalizado.");
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-11/RF-12 - edições concorrentes não perdem a edição aceite",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const first = await connect();
		const second = await connect();
		const other = await connect();

		try {
			if (!admin || !first || !second || !other) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			// Arranca os dois pedidos antes de esperar por qualquer um deles.
			const attempts = [
				{ ownerData: OWNER_A, response: hospitalize(makeApp(first), ids, OWNER_A) },
				{ ownerData: OWNER_B, response: hospitalize(makeApp(second), ids, OWNER_B) },
			];

			const responses = await Promise.all(attempts.map((attempt) => attempt.response));
			const statuses = responses.map((response) => response?.status);
			assertEquals(
				statuses.filter((status) => status === 201).length,
				1,
				"Apenas uma edição/hospitalização pode ser aceite.",
			);
			assertEquals(
				statuses.filter((status) => status === 400).length,
				1,
				"A segunda tem de ser recusada.",
			);

			const acceptedIndex = statuses.indexOf(201);
			const accepted = attempts[acceptedIndex].ownerData;

			const owner = await readOwner(other, ids);
			assertEquals(owner.name, accepted.name, "O tutor tem de ficar com a edição aceite.");
			assertEquals(owner.phone_number, accepted.phoneNumber);
			assertEquals(owner.whatsapp, accepted.whatsapp);

			const counts = await readCounts(other, ids);
			assertEquals(counts.hospitalizations, 1);
			assertEquals(counts.budgets, 1);
			assertEquals(counts.status, "HOSPITALIZADO");
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await first?.end();
			await second?.end();
			await other?.end();
		}
	},
});
