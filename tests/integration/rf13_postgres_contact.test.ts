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
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * RF-13 contra o Postgres real: persistir, restaurar e nunca misturar o contacto
 * específico com o tutor principal.
 *
 * Requer a base de dados de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf13_postgres_contact.test.ts
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

const CONTACT = { name: "Maria José", phoneNumber: "923456789", whatsapp: true };

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
		systemId: `rf13trans${unique}`,
		patientId: `RF13-${sequence}-${unique.substring(0, 12)}`,
		ownerId: `rf13owner${unique}`,
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
			"Rex RF13",
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

interface ContactRow {
	contact_name: string | null;
	contact_phone_number: string | null;
	contact_whatsapp: boolean | null;
}

interface Counts {
	hospitalizations: number;
	budgets: number;
	status: string;
	ownerName: string;
	ownerPhone: string;
	ownerWhatsapp: boolean;
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
	const patient = await client.queryObject<{ status: string }>(
		"SELECT status FROM patients WHERE system_id = $1",
		[ids.systemId],
	);
	const owner = await client.queryObject<{
		name: string;
		phone_number: string;
		whatsapp: boolean;
	}>("SELECT name, phone_number, whatsapp FROM owners WHERE owner_id = $1", [ids.ownerId]);

	return {
		hospitalizations: hospitalizations.rows[0].count,
		budgets: budgets.rows[0].count,
		status: patient.rows[0].status,
		ownerName: owner.rows[0].name,
		ownerPhone: owner.rows[0].phone_number,
		ownerWhatsapp: owner.rows[0].whatsapp,
	};
}

async function readContact(client: Client, ids: TestIds): Promise<ContactRow> {
	const result = await client.queryObject<ContactRow>(
		"SELECT contact_name, contact_phone_number, contact_whatsapp FROM hospitalizations WHERE system_id = $1",
		[ids.systemId],
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
	app.use(patientsRouter(service, new PostgresTransationController(client)).routes());
	return app;
}

function hospitalize(
	app: Application,
	ids: TestIds,
	contact?: typeof CONTACT,
): Promise<Response | undefined> {
	return app.handle(
		new Request("http://localhost/patients/hospitalize", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				patientId: ids.systemId,
				hospitalizationData: contact
					? { ...HOSPITALIZATION_DATA, contact }
					: HOSPITALIZATION_DATA,
				budgetData: BUDGET_DATA,
			}),
		}),
	);
}

Deno.test({
	name: "RF-13 - com excepção grava o contacto no episódio e não toca no tutor",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const response = await hospitalize(makeApp(client), ids, CONTACT);
			assertEquals(response?.status, 201);

			const contact = await readContact(admin, ids);
			assertEquals(contact.contact_name, CONTACT.name);
			assertEquals(contact.contact_phone_number, CONTACT.phoneNumber);
			assertEquals(contact.contact_whatsapp, CONTACT.whatsapp);

			const counts = await readCounts(admin, ids);
			assertEquals(counts.hospitalizations, 1);
			assertEquals(counts.budgets, 1);
			assertEquals(counts.status, "HOSPITALIZADO");
			assertEquals(counts.ownerName, "Tutor Original", "O tutor não pode ser alterado.");
			assertEquals(counts.ownerPhone, "900000000");
			assertEquals(counts.ownerWhatsapp, false);
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-13 - sem excepção o episódio fica sem contacto próprio",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const response = await hospitalize(makeApp(client), ids);
			assertEquals(response?.status, 201);

			const contact = await readContact(admin, ids);
			assertEquals(contact.contact_name, null);
			assertEquals(contact.contact_phone_number, null);
			assertEquals(contact.contact_whatsapp, null);
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-13 - um nome no limite da coluna (50) é gravado sem erro de servidor",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();
		const name = "a".repeat(50);

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const response = await hospitalize(makeApp(client), ids, { ...CONTACT, name });
			assertEquals(response?.status, 201);

			const contact = await readContact(admin, ids);
			assertEquals(contact.contact_name, name);
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-13 - falha ao guardar o orçamento não deixa hospitalização nem contacto parciais",
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
			const response = await hospitalize(makeApp(client, budgetRepository), ids, CONTACT);
			assertEquals(response?.status, 500);

			const counts = await readCounts(admin, ids);
			assertEquals(counts.hospitalizations, 0, "O rollback tem de remover a hospitalização.");
			assertEquals(counts.budgets, 0);
			assertEquals(counts.status, DISCHARGED);
			assertEquals(counts.ownerName, "Tutor Original");
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-13 - o repositório restaura a excepção e mantém-na ao encerrar",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const response = await hospitalize(makeApp(client), ids, CONTACT);
			assertEquals(response?.status, 201);

			const repository = new PostgresHospitalizationRepository(admin);
			const open = await repository.findOpenByPatientId(ID.fromString(ids.systemId));
			assertEquals(open.length, 1);
			assertEquals(open[0].contact?.name, CONTACT.name);
			assertEquals(open[0].contact?.phoneNumber, CONTACT.phoneNumber);
			assertEquals(open[0].contact?.whatsapp, CONTACT.whatsapp);

			open[0].close(new Date("2021-01-10T00:00:00.000Z"));
			await repository.update(open[0]);

			const afterClose = await readContact(admin, ids);
			assertEquals(
				afterClose.contact_name,
				CONTACT.name,
				"encerrar a hospitalização não pode apagar a excepção guardada",
			);
		} finally {
			if (admin) await deleteTestPatient(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});
