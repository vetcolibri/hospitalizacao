import { assertEquals, assertInstanceOf } from "dev_deps";
import { Client } from "deps";
import { CrmService } from "application/crm_service.ts";
import { HospitalizationHistoryService } from "application/hospitalization_history_service.ts";
import { PatientService } from "application/patient_service.ts";
import { RoundService } from "application/round_service.ts";
import { HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { MultipleOpenHospitalizations } from "domain/hospitalization/multiple_open_hospitalizations_error.ts";
import { PatientAlreadyDischarged } from "domain/patient/patient_already_discharged_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { PostgresBudgetRepository } from "persistence/postgres/postgres_budget_repository.ts";
import { PostgresHospitalizationLinkDiagnostic } from "persistence/postgres/postgres_hospitalization_link_diagnostic.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { PostgresMeasurementService } from "persistence/postgres/postgres_measurement_service.ts";
import { PostgresOwnerRepository } from "persistence/postgres/postgres_owner_repository.ts";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";
import { PostgresReportRepository } from "persistence/postgres/postgres_report_repository.ts";
import { PostgresReportService } from "persistence/postgres/postgres_report_service.ts";
import { PostgresRoundRepository } from "persistence/postgres/postgres_round_repository.ts";
import { PostgresTransationController } from "persistence/postgres/postgres_transaction_controller.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * RF-16 contra o Postgres real — ciclo clínico completo com UM paciente
 * sintético e DOIS episódios:
 *
 *   criar ficha + tutor -> abrir A -> orçamento + ronda + relatório/descargas
 *   + contacto -> encerrar A -> abrir B (id próprio) -> dados diferentes em B
 *   -> consultar A e B separadamente.
 *
 * Prova que encerrar não elimina nada (hospitalização, orçamento, rondas,
 * medições, relatórios, descargas, contacto), que abrir B não altera A, que o
 * histórico funciona com o episódio encerrado e depois de nova hospitalização,
 * e que as FKs de histórico bloqueiam a eliminação do episódio.
 *
 * Requer a base de dados de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf16_postgres_closure_cycle.test.ts
 */
const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON =
	"Define TEST_DATABASE_URL para correr o ciclo real contra o Postgres.";

const MEDVET = "medvet-rf16";

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

interface SyntheticIds {
	ownerId: string;
	clinicId: string;
	systemId: string;
	episodeA: string;
	episodeB: string;
}

function makeSyntheticIds(): SyntheticIds {
	const unique = crypto.randomUUID().replaceAll("-", "").substring(0, 10);
	return {
		ownerId: `rf16o${unique}`,
		clinicId: `RF16-${unique}`,
		systemId: "",
		episodeA: "",
		episodeB: "",
	};
}

function makePatientService(client: Client): PatientService {
	return new PatientService(
		new PostgresPatientRepository(client),
		new PostgresOwnerRepository(client),
		new PostgresHospitalizationRepository(client),
		new PostgresBudgetRepository(client),
		new InmemAlertRepository(),
		userRepository,
		new AlertNotifierDummy(),
	);
}

function makeRoundService(client: Client): RoundService {
	return new RoundService(
		new PostgresRoundRepository(client),
		new PostgresPatientRepository(client),
		new PostgresHospitalizationRepository(client),
		userRepository,
		new PostgresMeasurementService(client),
	);
}

function makeCrmService(client: Client): CrmService {
	return new CrmService(
		new PostgresOwnerRepository(client),
		new PostgresPatientRepository(client),
		new PostgresHospitalizationRepository(client),
		new PostgresReportRepository(client),
		new PostgresBudgetRepository(client),
		userRepository,
		new PostgresReportService(client),
	);
}

function makeHistoryService(client: Client): HospitalizationHistoryService {
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

async function inTransaction<T>(client: Client, fn: () => Promise<T>): Promise<T> {
	const transaction = new PostgresTransationController(client);
	await transaction.begin();

	try {
		const result = await fn();
		await transaction.commit();
		return result;
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

async function openEpisodeIds(client: Client, systemId: string): Promise<string[]> {
	const result = await client.queryObject<{ hospitalization_id: string }>(
		"SELECT hospitalization_id FROM hospitalizations WHERE system_id = $1 AND status = $2 ORDER BY hospitalization_id",
		[systemId, HospitalizationStatus.Open],
	);
	return result.rows.map((row) => row.hospitalization_id);
}

async function scalar(client: Client, sql: string, params: unknown[] = []): Promise<number> {
	const result = await client.queryObject<{ count: number }>(sql, params);
	return result.rows[0].count;
}

async function legacyCounts(client: Client): Promise<{ reports: number; rounds: number }> {
	const result = await client.queryObject<{ reports: number; rounds: number }>(
		`SELECT
			(SELECT count(*)::int FROM reports WHERE hospitalization_id IS NULL) AS reports,
			(SELECT count(*)::int FROM rounds WHERE hospitalization_id IS NULL) AS rounds`,
	);
	return result.rows[0];
}

async function cleanup(client: Client, ids: SyntheticIds): Promise<void> {
	if (ids.systemId) {
		await client.queryObject(
			"DELETE FROM discharges WHERE report_id IN (SELECT report_id FROM reports WHERE system_id = $1)",
			[ids.systemId],
		);
		await client.queryObject(
			"DELETE FROM measurements WHERE round_id IN (SELECT round_id FROM rounds WHERE system_id = $1)",
			[ids.systemId],
		);
		await client.queryObject(
			"DELETE FROM budgets WHERE hospitalization_id IN (SELECT hospitalization_id FROM hospitalizations WHERE system_id = $1)",
			[ids.systemId],
		);
		await client.queryObject("DELETE FROM reports WHERE system_id = $1", [ids.systemId]);
		await client.queryObject("DELETE FROM rounds WHERE system_id = $1", [ids.systemId]);
		await client.queryObject("DELETE FROM hospitalizations WHERE system_id = $1", [ids.systemId]);
		await client.queryObject("DELETE FROM patients WHERE system_id = $1", [ids.systemId]);
	}

	await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [ids.ownerId]);
}

Deno.test({
	name: "RF-16 - ciclo de dois episódios preserva e isola o histórico",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeSyntheticIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			const baseline = await legacyCounts(admin);

			const patientService = makePatientService(client);
			const roundService = makeRoundService(client);
			const crmService = makeCrmService(client);
			const historyService = makeHistoryService(client);

			// 1) Ficha + tutor + episódio A (com contacto específico e orçamento).
			const created = await inTransaction(client, () =>
				patientService.newPatient({
					patientData: {
						patientId: ids.clinicId,
						name: "Rex RF16",
						specie: "CANINO",
						breed: "bulldog",
						birthDate: "2013-07-01",
					},
					ownerData: {
						ownerId: ids.ownerId,
						name: "Tutor RF16",
						phoneNumber: "923000111",
						whatsapp: true,
					},
					hospitalizationData: {
						entryDate: "2026-01-01",
						weight: 12.5,
						complaints: ["Queixa A"],
						diagnostics: ["Diagnostico A"],
						contact: {
							name: "Contacto Episódio A",
							phoneNumber: "923000222",
							whatsapp: false,
						},
					},
					budgetData: {
						startOn: "2026-01-01",
						endOn: "2026-01-10",
						status: "NÃO PAGO",
					},
					username: MEDVET,
				})
			);
			assertEquals(created.isRight(), true, "O paciente sintético tem de ser criado.");

			const patientOrErr = await new PostgresPatientRepository(client).findByPatientId(
				ID.fromString(ids.clinicId),
			);
			assertEquals(patientOrErr.isRight(), true);
			ids.systemId = patientOrErr.value.systemId.value;

			const [episodeA] = await openEpisodeIds(admin, ids.systemId);
			ids.episodeA = episodeA;
			assertEquals(typeof episodeA, "string", "O episódio A tem de existir.");

			// 2) Orçamento (status), ronda e relatório/comunicações do episódio A.
			const roundA = await inTransaction(client, () =>
				roundService.new(ids.systemId, { heartRate: { value: 101 } }, MEDVET)
			);
			assertEquals(roundA.isRight(), true, "A ronda de A tem de ser aceite.");

			const reportA = await inTransaction(client, () =>
				crmService.registerReport({
					patientId: ids.systemId,
					stateOfConsciousness: ["Alerta A"],
					food: { types: ["Ração A"], level: "1", datetime: "2026-01-02T09:00:00.000Z" },
					discharges: [{ type: "Urina", aspects: ["Normal A"] }],
					comments: "Relatório do episódio A",
				}, MEDVET)
			);
			assertEquals(reportA.isRight(), true, "O relatório de A tem de ser aceite.");

			const budgetA = await inTransaction(client, () =>
				patientService.endBudget(ids.systemId, ids.episodeA, "PENDENTE", MEDVET)
			);
			assertEquals(budgetA.isRight(), true, "O orçamento de A tem de aceitar o novo estado.");

			// 3) Encerrar A.
			const closedA = await inTransaction(client, () =>
				patientService.endHospitalization(ids.systemId, MEDVET)
			);
			assertEquals(closedA.isRight(), true, "A tem de ser encerrado.");

			// Encerrar não elimina a hospitalização, o orçamento, as rondas, as
			// medições, os relatórios, as descargas nem o contacto.
			const episodeAStatus = await admin.queryObject<{ status: string; discharge_date: string; contact_name: string }>(
				"SELECT status, discharge_date, contact_name FROM hospitalizations WHERE hospitalization_id = $1",
				[ids.episodeA],
			);
			assertEquals(episodeAStatus.rows[0].status, HospitalizationStatus.Close);
			assertEquals(episodeAStatus.rows[0].discharge_date != null, true);
			assertEquals(episodeAStatus.rows[0].contact_name, "Contacto Episódio A");

			assertEquals(
				await scalar(admin, "SELECT count(*)::int FROM budgets WHERE hospitalization_id = $1", [ids.episodeA]),
				1,
			);
			assertEquals(
				await scalar(admin, "SELECT count(*)::int FROM rounds WHERE hospitalization_id = $1", [ids.episodeA]),
				1,
			);
			assertEquals(
				await scalar(
					admin,
					"SELECT count(*)::int FROM measurements WHERE round_id IN (SELECT round_id FROM rounds WHERE hospitalization_id = $1)",
					[ids.episodeA],
				),
				1,
			);
			assertEquals(
				await scalar(admin, "SELECT count(*)::int FROM reports WHERE hospitalization_id = $1", [ids.episodeA]),
				1,
			);
			assertEquals(
				await scalar(
					admin,
					"SELECT count(*)::int FROM discharges WHERE report_id IN (SELECT report_id FROM reports WHERE hospitalization_id = $1)",
					[ids.episodeA],
				),
				1,
			);

			// 4) Abrir B com ID próprio e dados diferentes (sem contacto específico).
			const openedB = await inTransaction(client, () =>
				patientService.newHospitalization(
					ids.systemId,
					{
						entryDate: "2026-02-01",
						weight: 15.5,
						complaints: ["Queixa B"],
						diagnostics: ["Diagnostico B"],
					},
					{ startOn: "2026-02-01", endOn: "2026-02-10", status: "PAGO" },
					MEDVET,
				)
			);
			assertEquals(openedB.isRight(), true, "B tem de ser aberto.");

			const [episodeB] = await openEpisodeIds(admin, ids.systemId);
			ids.episodeB = episodeB;
			assertEquals(episodeB !== ids.episodeA, true, "B tem de ter um ID próprio.");

			const roundB = await inTransaction(client, () =>
				roundService.new(ids.systemId, { heartRate: { value: 202 } }, MEDVET)
			);
			assertEquals(roundB.isRight(), true, "A ronda de B tem de ser aceite.");

			const reportB = await inTransaction(client, () =>
				crmService.registerReport({
					patientId: ids.systemId,
					stateOfConsciousness: ["Alerta B"],
					food: { types: ["Ração B"], level: "2", datetime: "2026-02-02T09:00:00.000Z" },
					discharges: [{ type: "Fezes", aspects: ["Normal B"] }],
					comments: "Relatório do episódio B",
				}, MEDVET)
			);
			assertEquals(reportB.isRight(), true, "O relatório de B tem de ser aceite.");

			// 5) Abrir B não alterou A.
			const historyA = await historyService.detail(ids.systemId, ids.episodeA);
			assertEquals(historyA.isRight(), true);
			assertEquals(historyA.value.hospitalization.status, HospitalizationStatus.Close);
			assertEquals(historyA.value.hospitalization.weight, 12.5);
			assertEquals(historyA.value.hospitalization.complaints, ["Queixa A"]);
			assertEquals(historyA.value.rounds.length, 1);
			assertEquals(historyA.value.rounds[0].parameters[0].value, 101);
			assertEquals(historyA.value.rounds[0].hospitalizationId.value, ids.episodeA);
			assertEquals(historyA.value.reports.length, 1);
			assertEquals(historyA.value.reports[0].comments, "Relatório do episódio A");
			assertEquals(historyA.value.reports[0].discharges[0].aspects, ["Normal A"]);
			assertEquals(historyA.value.contactIsSpecific, true);
			assertEquals(historyA.value.contact?.name, "Contacto Episódio A");
			assertEquals(historyA.value.budget?.status, "PENDENTE");

			const historyB = await historyService.detail(ids.systemId, ids.episodeB);
			assertEquals(historyB.isRight(), true);
			assertEquals(historyB.value.hospitalization.status, HospitalizationStatus.Open);
			assertEquals(historyB.value.hospitalization.weight, 15.5);
			assertEquals(historyB.value.hospitalization.complaints, ["Queixa B"]);
			assertEquals(historyB.value.rounds[0].parameters[0].value, 202);
			assertEquals(historyB.value.reports[0].comments, "Relatório do episódio B");
			assertEquals(historyB.value.contactIsSpecific, false);
			assertEquals(historyB.value.contact?.name, "Tutor RF16");
			assertEquals(historyB.value.budget?.status, "PAGO");

			// Nenhum dado de A aparece em B, nem vice-versa.
			const historyARecordIds = historyA.value.reports.map((report) => report.reportId.value);
			assertEquals(
				historyB.value.reports.some((report) => historyARecordIds.includes(report.reportId.value)),
				false,
			);

			// 6) O histórico funciona com o episódio encerrado e depois da nova
			// hospitalização, e continua independente do estado actual.
			const history = await historyService.listByPatient(ids.systemId);
			assertEquals(
				history.map((item) => item.hospitalizationId),
				[ids.episodeB, ids.episodeA],
				"B (mais recente) primeiro, A encerrado depois.",
			);
			assertEquals(
				history.map((item) => item.status),
				[HospitalizationStatus.Open, HospitalizationStatus.Close],
			);

			// 7) Nada do ciclo ficou por classificar: tudo associado ao episódio.
			assertEquals(await legacyCounts(admin), baseline, "O legado não pode ser tocado.");
			assertEquals(
				await scalar(admin, "SELECT count(*)::int FROM reports WHERE system_id = $1 AND hospitalization_id IS NULL", [ids.systemId]),
				0,
			);
			assertEquals(
				await scalar(admin, "SELECT count(*)::int FROM rounds WHERE system_id = $1 AND hospitalization_id IS NULL", [ids.systemId]),
				0,
			);

			// 8) Eliminar um episódio com histórico é bloqueado pelas FKs RESTRICT.
			let blocked = false;
			try {
				await admin.queryObject("DELETE FROM hospitalizations WHERE hospitalization_id = $1", [
					ids.episodeA,
				]);
			} catch {
				blocked = true;
			}
			assertEquals(blocked, true, "Eliminar o episódio A tem de ser bloqueado.");

			blocked = false;
			try {
				await admin.queryObject("DELETE FROM hospitalizations WHERE hospitalization_id = $1", [
					ids.episodeB,
				]);
			} catch {
				blocked = true;
			}
			assertEquals(blocked, true, "Eliminar o episódio B tem de ser bloqueado.");

			// 9) O link do tutor (relatórios do paciente) não expõe o episódio
			// encerrado nem é servido sem uma hospitalização aberta inequívoca.
			const reportsLink = await crmService.findReports(ids.systemId);
			assertEquals(reportsLink.isRight(), true, "Com B aberto o link do tutor continua a funcionar.");
			assertEquals(reportsLink.value.length, 1);
			assertEquals(reportsLink.value[0].comments, "Relatório do episódio B");
		} finally {
			if (admin) await cleanup(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-16 - encerramento ambíguo é recusado sem fechar nada",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeSyntheticIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			await admin.queryObject(
				"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
				[ids.ownerId, "Tutor RF16 ambíguo", "923000333", false],
			);
			await admin.queryObject(
				"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
				[`sys-${ids.clinicId}`, ids.clinicId, "Rex RF16 ambíguo", "CANINO", "bulldog", "HOSPITALIZADO", "2013-07-01", ids.ownerId],
			);
			ids.systemId = `sys-${ids.clinicId}`;

			for (const id of [`${ids.clinicId}-h1`, `${ids.clinicId}-h2`]) {
				await admin.queryObject(
					"INSERT INTO hospitalizations (hospitalization_id, weight, complaints, diagnostics, entry_date, status, system_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
					[id, 12, '"Queixa"', '"Diagnostico"', "2026-01-01 08:00:00", HospitalizationStatus.Open, ids.systemId],
				);
				await admin.queryObject(
					"INSERT INTO budgets (budget_id, start_on, end_on, status, hospitalization_id) VALUES ($1, $2, $3, $4, $5)",
					[`b-${id}`, "2026-01-01", "2026-01-10", "PENDENTE", id],
				);
			}

			const patientService = makePatientService(client);

			const closed = await inTransaction(client, () =>
				patientService.endHospitalization(ids.systemId, MEDVET)
			);
			assertEquals(closed.isLeft(), true);
			assertInstanceOf(closed.value, MultipleOpenHospitalizations);

			const paid = await inTransaction(client, () =>
				patientService.endBudget(ids.systemId, `${ids.clinicId}-h1`, "PAGO", MEDVET)
			);
			assertEquals(paid.isLeft(), true);
			assertInstanceOf(paid.value, MultipleOpenHospitalizations);

			const open = await openEpisodeIds(admin, ids.systemId);
			assertEquals(open.length, 2, "Nenhum episódio pode ser encerrado por ambiguidade.");

			const budgetStatuses = await admin.queryObject<{ status: string }>(
				"SELECT status FROM budgets WHERE hospitalization_id = $1",
				[`${ids.clinicId}-h1`],
			);
			assertEquals(budgetStatuses.rows[0].status, "PENDENTE", "O orçamento não pode mudar.");
		} finally {
			if (admin) await cleanup(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});

Deno.test({
	name: "RF-16 - encerramentos concorrentes fecham o episódio uma só vez",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeSyntheticIds();
		const admin = await connect();
		const first = await connect();
		const second = await connect();

		try {
			if (!admin || !first || !second) throw new Error("Ligação indisponível");

			const created = await inTransaction(first, () =>
				makePatientService(first).newPatient({
					patientData: {
						patientId: ids.clinicId,
						name: "Rex RF16 concorrente",
						specie: "CANINO",
						breed: "bulldog",
						birthDate: "2013-07-01",
					},
					ownerData: {
						ownerId: ids.ownerId,
						name: "Tutor RF16 concorrente",
						phoneNumber: "923000444",
						whatsapp: false,
					},
					hospitalizationData: {
						entryDate: "2026-01-01",
						weight: 12.5,
						complaints: ["Queixa"],
						diagnostics: ["Diagnostico"],
					},
					budgetData: { startOn: "2026-01-01", endOn: "2026-01-10", status: "PAGO" },
					username: MEDVET,
				})
			);
			assertEquals(created.isRight(), true);

			const patient = await new PostgresPatientRepository(admin).findByPatientId(
				ID.fromString(ids.clinicId),
			);
			ids.systemId = patient.value.systemId.value;

			const close = async (client: Client) =>
				inTransaction(client, () =>
					makePatientService(client).endHospitalization(ids.systemId, MEDVET)
				);

			const results = await Promise.all([close(first), close(second)]);

			const accepted = results.filter((result) => result.isRight());
			const refused = results.filter((result) => result.isLeft());

			assertEquals(accepted.length, 1, "Só um encerramento pode ser aceite.");
			assertEquals(refused.length, 1, "O segundo tem de ser recusado.");
			assertInstanceOf(refused[0].value, HospitalizationNotFound);

			const closed = await admin.queryObject<{ count: number }>(
				"SELECT count(*)::int AS count FROM hospitalizations WHERE system_id = $1 AND status = $2",
				[ids.systemId, HospitalizationStatus.Close],
			);
			assertEquals(closed.rows[0].count, 1, "O episódio tem de ficar encerrado uma só vez.");
		} finally {
			if (admin) await cleanup(admin, ids);
			await admin?.end();
			await first?.end();
			await second?.end();
		}
	},
});

Deno.test({
	name: "RF-16 - escrita nova é recusada num episódio encerrado",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async () => {
		const ids = makeSyntheticIds();
		const admin = await connect();
		const client = await connect();

		try {
			if (!admin || !client) throw new Error("Ligação indisponível");

			const patientService = makePatientService(client);
			const roundService = makeRoundService(client);
			const crmService = makeCrmService(client);

			await inTransaction(client, () =>
				patientService.newPatient({
					patientData: {
						patientId: ids.clinicId,
						name: "Rex RF16 read-only",
						specie: "CANINO",
						breed: "bulldog",
						birthDate: "2013-07-01",
					},
					ownerData: {
						ownerId: ids.ownerId,
						name: "Tutor RF16 read-only",
						phoneNumber: "923000555",
						whatsapp: false,
					},
					hospitalizationData: {
						entryDate: "2026-01-01",
						weight: 12.5,
						complaints: ["Queixa"],
						diagnostics: ["Diagnostico"],
					},
					budgetData: { startOn: "2026-01-01", endOn: "2026-01-10", status: "PAGO" },
					username: MEDVET,
				})
			);

			const patient = await new PostgresPatientRepository(admin).findByPatientId(
				ID.fromString(ids.clinicId),
			);
			ids.systemId = patient.value.systemId.value;
			ids.episodeA = (await openEpisodeIds(admin, ids.systemId))[0];

			await inTransaction(client, () =>
				patientService.endHospitalization(ids.systemId, MEDVET)
			);

			// Sem hospitalização aberta, nem rondas nem relatórios pertencem ao
			// episódio encerrado; o link do tutor também é recusado.
			const round = await inTransaction(client, () =>
				roundService.new(ids.systemId, { heartRate: { value: 99 } }, MEDVET)
			);
			assertEquals(round.isLeft(), true);
			assertInstanceOf(round.value, PatientAlreadyDischarged);

			const report = await inTransaction(client, () =>
				crmService.registerReport({
					patientId: ids.systemId,
					stateOfConsciousness: ["Alerta"],
					food: { types: ["Ração"], level: "1", datetime: "2026-01-02T09:00:00.000Z" },
					discharges: [],
					comments: "Não pode ser guardado",
				}, MEDVET)
			);
			assertEquals(report.isLeft(), true);
			assertInstanceOf(report.value, PatientNotHospitalized);

			const reportsLink = await crmService.findReports(ids.systemId);
			assertEquals(reportsLink.isLeft(), true);
			assertInstanceOf(reportsLink.value, PatientNotHospitalized);

			const paidClosed = await inTransaction(client, () =>
				patientService.endBudget(ids.systemId, ids.episodeA, "NÃO PAGO", MEDVET)
			);
			assertEquals(paidClosed.isLeft(), true);
			assertInstanceOf(paidClosed.value, HospitalizationNotFound);

			assertEquals(
				await scalar(admin, "SELECT count(*)::int FROM rounds WHERE hospitalization_id = $1", [ids.episodeA]),
				0,
			);
			assertEquals(
				await scalar(admin, "SELECT count(*)::int FROM reports WHERE hospitalization_id = $1", [ids.episodeA]),
				0,
			);
		} finally {
			if (admin) await cleanup(admin, ids);
			await admin?.end();
			await client?.end();
		}
	},
});
