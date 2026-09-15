import { assertEquals, assertInstanceOf } from "dev_deps";
import { Client } from "deps";
import { AlertService } from "application/alert_service.ts";
import { BudgetService } from "application/budget_service.ts";
import { PatientService } from "application/patient_service.ts";
import { AlertStatus } from "domain/hospitalization/alerts/alert.ts";
import { HospitalizationNotOpen } from "domain/hospitalization/hospitalization_not_open_error.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { PostgresAlertRepository } from "persistence/postgres/postgres_alert_repository.ts";
import { PostgresBudgetRepository } from "persistence/postgres/postgres_budget_repository.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { PostgresOwnerRepository } from "persistence/postgres/postgres_owner_repository.ts";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * RF-16 contra o Postgres real — races de escrita contra o encerramento.
 *
 * 1) BudgetService.update tem de revalidar a hospitalização DEPOIS de obter o
 *    mesmo lock de paciente usado no encerramento; nenhuma alteração pode ser
 *    confirmada depois de o episódio estar fechado.
 * 2) AlertService.schedule tem de ler as hospitalizações sob o lock; um alerta
 *    nunca fica activo num episódio encerrado.
 *
 * A ordem de locks é sempre paciente -> hospitalização -> (orçamento/alerta),
 * igual à do encerramento, para não haver deadlock.
 *
 * Requer a base de dados de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf16_postgres_write_races.test.ts
 */
const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON = "Define TEST_DATABASE_URL para correr as races reais contra o Postgres.";

const MEDVET = "medvet-rf16-race";

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

const userRepository = new InmemUserRepository([
	new User(MEDVET, MEDVET, Role.MedVet),
]);

interface RaceIds {
	ownerId: string;
	clinicId: string;
	systemId: string;
	hospitalizationId: string;
	budgetId: string;
}

function makeRaceIds(): RaceIds {
	const unique = crypto.randomUUID().replaceAll("-", "").substring(0, 10);
	return {
		ownerId: `rf16raceo${unique}`,
		clinicId: `RF16RACE-${unique}`,
		systemId: `rf16racesys${unique}`,
		hospitalizationId: `rf16raceh${unique}`,
		budgetId: `rf16raceb${unique}`,
	};
}

async function seed(client: Client, ids: RaceIds): Promise<void> {
	await client.queryObject(
		"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
		[ids.ownerId, "Tutor RF16 race", "923000777", false],
	);
	await client.queryObject(
		"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			ids.systemId,
			ids.clinicId,
			"Rex RF16 race",
			"CANINO",
			"bulldog",
			"HOSPITALIZADO",
			"2013-07-01",
			ids.ownerId,
		],
	);
	await client.queryObject(
		"INSERT INTO hospitalizations (hospitalization_id, weight, complaints, diagnostics, entry_date, status, system_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		[
			ids.hospitalizationId,
			12,
			'"Queixa"',
			'"Diagnostico"',
			"2026-01-01 08:00:00",
			"Aberta",
			ids.systemId,
		],
	);
	await client.queryObject(
		"INSERT INTO budgets (budget_id, start_on, end_on, status, hospitalization_id) VALUES ($1, $2, $3, $4, $5)",
		[ids.budgetId, "2026-01-01", "2026-01-10", "PENDENTE", ids.hospitalizationId],
	);
}

async function cleanup(client: Client, ids: RaceIds): Promise<void> {
	await client.queryObject("DELETE FROM alerts WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM budgets WHERE hospitalization_id = $1", [
		ids.hospitalizationId,
	]);
	await client.queryObject("DELETE FROM hospitalizations WHERE hospitalization_id = $1", [
		ids.hospitalizationId,
	]);
	await client.queryObject("DELETE FROM patients WHERE system_id = $1", [ids.systemId]);
	await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [ids.ownerId]);
}

function makePatientService(client: Client): PatientService {
	return new PatientService(
		new PostgresPatientRepository(client),
		new PostgresOwnerRepository(client),
		new PostgresHospitalizationRepository(client),
		new PostgresBudgetRepository(client),
		new PostgresAlertRepository(client),
		userRepository,
		new AlertNotifierDummy(),
	);
}

function makeBudgetService(client: Client): BudgetService {
	return new BudgetService(
		new PostgresBudgetRepository(client),
		userRepository,
		new PostgresHospitalizationRepository(client),
		new PostgresPatientRepository(client),
	);
}

function makeAlertService(client: Client): AlertService {
	return new AlertService(
		new PostgresAlertRepository(client),
		new PostgresPatientRepository(client),
		userRepository,
		new AlertNotifierDummy(),
		new PostgresHospitalizationRepository(client),
	);
}

async function budgetStartOn(client: Client, ids: RaceIds): Promise<string> {
	const result = await client.queryObject<{ start_on: string }>(
		"SELECT to_char(start_on, 'YYYY-MM-DD') AS start_on FROM budgets WHERE budget_id = $1",
		[ids.budgetId],
	);
	return String(result.rows[0].start_on);
}

async function activeAlerts(client: Client, ids: RaceIds): Promise<number> {
	const result = await client.queryObject<{ count: number }>(
		"SELECT count(*)::int AS count FROM alerts WHERE system_id = $1 AND status = $2",
		[ids.systemId, AlertStatus.Enabled],
	);
	return result.rows[0].count;
}

Deno.test({
	name: "RF-16 - update do orçamento nunca confirma depois do encerramento",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeRaceIds();
		const admin = await connect();
		const closer = await connect();
		const updater = await connect();

		try {
			if (!admin || !closer || !updater) throw new Error("Ligação indisponível");

			await seed(admin, ids);

			// O encerramento adquire o lock do paciente e fica a segurá-lo.
			await closer.queryArray("BEGIN");
			await new PostgresPatientRepository(closer).lockBySystemId(ID.fromString(ids.systemId));

			// O update arranca, lê o orçamento/episódio e bloqueia no mesmo lock.
			await updater.queryArray("BEGIN");
			const updatePromise = makeBudgetService(updater).update(
				ids.budgetId,
				{ startOn: "2026-03-01", endOn: "2026-03-10" },
				MEDVET,
			);

			// O encerramento fecha o episódio e liberta o lock.
			const closed = await makePatientService(closer).endHospitalization(ids.systemId, MEDVET);
			assertEquals(closed.isRight(), true, "O encerramento tem de ser aceite.");
			await closer.queryArray("COMMIT");

			const update = await updatePromise;
			await updater.queryArray("ROLLBACK");

			assertEquals(update.isLeft(), true, "O update tem de ser recusado após o encerramento.");
			assertInstanceOf(update.value, HospitalizationNotOpen);

			const startOn = await budgetStartOn(admin, ids);
			assertEquals(
				startOn.startsWith("2026-01-01"),
				true,
				"O orçamento não pode ter sido alterado.",
			);
		} finally {
			if (admin) await cleanup(admin, ids);
			await admin?.end();
			await closer?.end();
			await updater?.end();
		}
	},
});

Deno.test({
	name: "RF-16 - alerta agendado antes do encerramento é cancelado, nunca fica activo",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeRaceIds();
		const admin = await connect();
		const scheduler = await connect();
		const closer = await connect();

		try {
			if (!admin || !scheduler || !closer) throw new Error("Ligação indisponível");

			await seed(admin, ids);

			// O agendamento adquire o lock do paciente e segura-o.
			await scheduler.queryArray("BEGIN");
			await new PostgresPatientRepository(scheduler).lockBySystemId(ID.fromString(ids.systemId));

			const schedulePromise = makeAlertService(scheduler).schedule({
				patientId: ids.systemId,
				parameters: ["heartRate"],
				rate: 120,
				time: "2026-01-10T10:00:00.000Z",
				comments: "Alerta race",
				username: MEDVET,
			});

			// O encerramento espera pelo lock.
			await closer.queryArray("BEGIN");
			const closePromise = makePatientService(closer).endHospitalization(ids.systemId, MEDVET);

			const schedule = await schedulePromise;
			assertEquals(schedule.isRight(), true, "Com uma aberta o alerta é aceite.");
			await scheduler.queryArray("COMMIT");

			const closed = await closePromise;
			assertEquals(closed.isRight(), true);
			await closer.queryArray("COMMIT");

			// O encerramento cancela o alerta já gravado: nenhum fica activo.
			assertEquals(await activeAlerts(admin, ids), 0);
		} finally {
			if (admin) await cleanup(admin, ids);
			await admin?.end();
			await scheduler?.end();
			await closer?.end();
		}
	},
});

Deno.test({
	name: "RF-16 - alerta agendado depois do encerramento é recusado",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeRaceIds();
		const admin = await connect();
		const scheduler = await connect();
		const closer = await connect();

		try {
			if (!admin || !scheduler || !closer) throw new Error("Ligação indisponível");

			await seed(admin, ids);

			// O encerramento adquire o lock primeiro e segura-o.
			await closer.queryArray("BEGIN");
			await new PostgresPatientRepository(closer).lockBySystemId(ID.fromString(ids.systemId));
			const closePromise = makePatientService(closer).endHospitalization(ids.systemId, MEDVET);

			// O agendamento espera pelo lock e, quando corre, já não há aberta.
			await scheduler.queryArray("BEGIN");
			const schedulePromise = makeAlertService(scheduler).schedule({
				patientId: ids.systemId,
				parameters: ["heartRate"],
				rate: 120,
				time: "2026-01-10T10:00:00.000Z",
				comments: "Alerta race tardio",
				username: MEDVET,
			});

			const closed = await closePromise;
			assertEquals(closed.isRight(), true);
			await closer.queryArray("COMMIT");

			const schedule = await schedulePromise;
			await scheduler.queryArray("ROLLBACK");

			assertEquals(schedule.isLeft(), true, "Sem aberta o alerta tem de ser recusado.");
			assertInstanceOf(schedule.value, HospitalizationNotFound);
			assertEquals(await activeAlerts(admin, ids), 0);
		} finally {
			if (admin) await cleanup(admin, ids);
			await admin?.end();
			await scheduler?.end();
			await closer?.end();
		}
	},
});
