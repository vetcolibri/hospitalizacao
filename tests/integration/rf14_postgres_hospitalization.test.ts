import { assertEquals, assertInstanceOf } from "dev_deps";
import { Application, Client } from "deps";
import { PatientService } from "application/patient_service.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { PatientAlreadyHospitalized } from "domain/patient/patient_already_hospitalized_error.ts";
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
 * Testes de transacção reais contra o Postgres da aplicação. Provam propriedades que
 * os repositórios em memória não conseguem provar: serialização da abertura de uma
 * hospitalização e atomicidade do rollback.
 *
 * Requerem a base de dados de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf14_postgres_hospitalization.test.ts
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
		systemId: `rf14trans${unique}`,
		patientId: `RF14-${sequence}-${unique.substring(0, 12)}`,
		ownerId: `rf14owner${unique}`,
	};
}

async function createTestPatient(client: Client, ids: TestIds): Promise<void> {
	await client.queryObject(
		"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
		[ids.ownerId, "Tutor RF14", "900000000", false],
	);
	await client.queryObject(
		"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[ids.systemId, ids.patientId, "Rex RF14", "CANINO", "bulldog", DISCHARGED, "2013-07-01", ids.ownerId],
	);
}

async function deleteTestPatient(client: Client, ids: TestIds): Promise<void> {
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

function makeUserRepository() {
	return new InmemUserRepository([new User(RECEPTION, RECEPTION, Role.Reception)]);
}

function makePatientService(
	client: Client,
	budgetRepository: PostgresBudgetRepository,
): PatientService {
	return new PatientService(
		new PostgresPatientRepository(client),
		new PostgresOwnerRepository(client),
		new PostgresHospitalizationRepository(client),
		budgetRepository,
		new InmemAlertRepository(),
		makeUserRepository(),
		new AlertNotifierDummy(),
	);
}

class FailingPostgresBudgetRepository extends PostgresBudgetRepository {
	hospitalizationsWhenFailing = 0;

	constructor(private connection: Client, private systemId: string) {
		super(connection);
	}

	override async save(): Promise<void> {
		// Confirma que a hospitalização já estava inserida na transacção quando a falha ocorreu.
		const result = await this.connection.queryObject<{ count: number }>(
			"SELECT count(*)::int AS count FROM hospitalizations WHERE system_id = $1",
			[this.systemId],
		);
		this.hospitalizationsWhenFailing = result.rows[0].count;

		return Promise.reject(new Error("falha ao guardar orçamento"));
	}
}

Deno.test({
	name: "RF-14 - duas hospitalizações concorrentes do mesmo paciente criam apenas uma",
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

			const hospitalize = async (client: Client) => {
				const transaction = new PostgresTransationController(client);
				const service = makePatientService(client, new PostgresBudgetRepository(client));

				await transaction.begin();
				try {
					const result = await service.newHospitalization(
						ids.systemId,
						HOSPITALIZATION_DATA,
						BUDGET_DATA,
						RECEPTION,
					);

					if (result.isLeft()) {
						await transaction.rollback();
						return result;
					}

					await transaction.commit();
					return result;
				} catch (error) {
					await transaction.rollback();
					throw error;
				}
			};

			const results = await Promise.all([
				hospitalize(first),
				hospitalize(second),
			]);

			const accepted = results.filter((result) => result.isRight());
			const refused = results.filter((result) => result.isLeft());

			assertEquals(accepted.length, 1, "Apenas uma hospitalização pode ser aceite.");
			assertEquals(refused.length, 1, "A segunda hospitalização tem de ser recusada.");
			assertInstanceOf(
				refused[0].value,
				PatientAlreadyHospitalized,
				"A recusa tem de ser @PatientAlreadyHospitalized.",
			);

			const counts = await readCounts(other, ids);
			assertEquals(counts.hospitalizations, 1, "A base de dados deve ter uma só hospitalização.");
			assertEquals(counts.budgets, 1, "A base de dados deve ter um só orçamento.");
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

Deno.test({
	name: "RF-14 - falha ao guardar o orçamento desfaz a hospitalização na transacção real",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeTestIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await createTestPatient(admin, ids);

			const budgetRepository = new FailingPostgresBudgetRepository(client, ids.systemId);
			const service = makePatientService(client, budgetRepository);
			const transaction = new PostgresTransationController(client);

			const app = new Application();
			app.use(async (ctx, next) => {
				ctx.state.username = RECEPTION;
				await next();
			});
			app.use(patientsRouter(service, transaction).routes());

			const response = await app.handle(
				new Request("http://localhost/patients/hospitalize", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						patientId: ids.systemId,
						hospitalizationData: HOSPITALIZATION_DATA,
						budgetData: BUDGET_DATA,
					}),
				}),
			);

			assertEquals(response?.status, 500);
			assertEquals(
				budgetRepository.hospitalizationsWhenFailing,
				1,
				"A hospitalização foi inserida antes da falha do orçamento.",
			);

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
