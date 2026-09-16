import { assertEquals } from "dev_deps";
import { Client } from "deps";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";

/**
 * Fase 2 — últimos internamentos: ordem, limite, filtros e datas contra o
 * Postgres real. Dados sintéticos (tokens aleatórios) removidos no fim; a
 * listagem é sempre limitada no servidor (nunca carrega a tabela toda).
 *
 * Requer a base de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf_recent_hospitalizations_postgres.test.ts
 */
const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON = "Define TEST_DATABASE_URL para correr a listagem real no Postgres.";

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
			// nunca chegou a ligar
		}
		return undefined;
	}
}

const probe = await connect();
const DB_AVAILABLE = probe !== undefined;
await probe?.end();

let seq = 0;
function token(): string {
	seq++;
	return `zr${crypto.randomUUID().replaceAll("-", "").substring(0, 6)}${seq}`;
}

interface Seeded {
	systemId: string;
	ownerId: string;
}

async function seedOwnerAndPatient(
	client: Client,
	input: {
		systemId: string;
		patientId: string;
		patientName: string;
		ownerId: string;
		ownerName: string;
	},
): Promise<Seeded> {
	await client.queryObject(
		"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
		[input.ownerId, input.ownerName, "923000000", false],
	);
	await client.queryObject(
		"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			input.systemId,
			input.patientId,
			input.patientName,
			"CANINO",
			"bulldog",
			"HOSPITALIZADO",
			"2013-07-01",
			input.ownerId,
		],
	);
	return { systemId: input.systemId, ownerId: input.ownerId };
}

async function seedHospitalization(
	client: Client,
	input: {
		hospitalizationId: string;
		systemId: string;
		entryDate: string;
		dischargeDate?: string;
		status?: string;
	},
): Promise<void> {
	await client.queryObject(
		"INSERT INTO hospitalizations (hospitalization_id, weight, complaints, diagnostics, entry_date, discharge_date, status, system_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			input.hospitalizationId,
			12.5,
			'"Queixa clinica"',
			'"Diagnostico clinico"',
			input.entryDate,
			input.dischargeDate ?? null,
			input.status ?? "Fechada",
			input.systemId,
		],
	);
}

async function cleanup(client: Client, seeded: Seeded[]): Promise<void> {
	for (const item of seeded) {
		await client.queryObject("DELETE FROM hospitalizations WHERE system_id = $1", [item.systemId]);
		await client.queryObject("DELETE FROM patients WHERE system_id = $1", [item.systemId]);
		await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [item.ownerId]);
	}
}

Deno.test({
	name: "últimos internamentos - ordem, limite, filtros e datas no Postgres",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async (t) => {
		const client = await connect();
		if (!client) throw new Error("Ligação indisponível");
		const repository = new PostgresHospitalizationRepository(client);
		const seeded: Seeded[] = [];

		try {
			await t.step("ordena por entrada DESC e limita a 20", async () => {
				const T = token();
				const ownerId = `orec-${T}`;
				const systemId = `srec-${T}`;
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId,
						patientId: `REC${T}`,
						patientName: "Paciente Limite",
						ownerId,
						ownerName: "Tutor Limite",
					}),
				);

				for (let i = 1; i <= 22; i++) {
					await seedHospitalization(client, {
						hospitalizationId: `hrec-${T}-${String(i).padStart(2, "0")}`,
						systemId,
						entryDate: `2026-01-${String(i).padStart(2, "0")} 08:00:00`,
					});
				}

				const results = await repository.findRecent({ term: `REC${T}` }, 20);

				assertEquals(results.length, 20);
				assertEquals(results[0].hospitalizationId, `hrec-${T}-22`);
				assertEquals(results[19].hospitalizationId, `hrec-${T}-03`);

				const dates = results.map((item) => item.entryDate.getTime());
				assertEquals(
					dates.every((value, index) => index === 0 || dates[index - 1] >= value),
					true,
					"entrada descendente",
				);
			});

			await t.step("termo literal e case-insensitive nos quatro campos", async () => {
				const T = token();
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId: `srec-p-${T}`,
						patientId: T,
						patientName: "Nome Sem Match",
						ownerId: `op-${T}`,
						ownerName: "Tutor Sem Match",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `srec-o-${T}`,
						patientId: `P-${T}`,
						patientName: "Nome Sem Match 2",
						ownerId: T,
						ownerName: "Tutor Sem Match 2",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `srec-pn-${T}`,
						patientId: `P2-${T}`,
						patientName: T.toUpperCase(),
						ownerId: `op2-${T}`,
						ownerName: "Tutor Sem Match 3",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `srec-on-${T}`,
						patientId: `P3-${T}`,
						patientName: "Nome Sem Match 4",
						ownerId: `op3-${T}`,
						ownerName: T.toUpperCase(),
					}),
				);

				for (const id of ["p", "o", "pn", "on"]) {
					await seedHospitalization(client, {
						hospitalizationId: `hrec-${id}-${T}`,
						systemId: `srec-${id}-${T}`,
						entryDate: "2026-02-01 08:00:00",
					});
				}

				const results = await repository.findRecent({ term: T }, 20);
				const systemIds = results.map((item) => item.systemId).sort();

				assertEquals(systemIds, [
					`srec-o-${T}`,
					`srec-on-${T}`,
					`srec-p-${T}`,
					`srec-pn-${T}`,
				].sort());
			});

			await t.step("percentagem e underscore são literais", async () => {
				const T = token();
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId: `srec-pct-${T}`,
						patientId: `PCT-${T}`,
						patientName: `${T}%x`,
						ownerId: `opct-${T}`,
						ownerName: "Tutor PCT",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `srec-pctw-${T}`,
						patientId: `PCTW-${T}`,
						patientName: `${T}Qx`,
						ownerId: `opctw-${T}`,
						ownerName: "Tutor PCTW",
					}),
				);

				await seedHospitalization(client, {
					hospitalizationId: `hpct-${T}`,
					systemId: `srec-pct-${T}`,
					entryDate: "2026-02-02 08:00:00",
				});
				await seedHospitalization(client, {
					hospitalizationId: `hpctw-${T}`,
					systemId: `srec-pctw-${T}`,
					entryDate: "2026-02-02 08:00:00",
				});

				const results = await repository.findRecent({ term: `${T}%x` }, 20);

				assertEquals(results.map((item) => item.hospitalizationId), [`hpct-${T}`]);
			});

			await t.step("from/to são inclusivos por data de entrada", async () => {
				const T = token();
				const ownerId = `orange-${T}`;
				const systemId = `srange-${T}`;
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId,
						patientId: `RANGE${T}`,
						patientName: "Paciente Range",
						ownerId,
						ownerName: "Tutor Range",
					}),
				);

				await seedHospitalization(client, {
					hospitalizationId: `hr-${T}-1`,
					systemId,
					entryDate: "2026-01-01 23:30:00",
				});
				await seedHospitalization(client, {
					hospitalizationId: `hr-${T}-2`,
					systemId,
					entryDate: "2026-01-15 00:00:00",
				});
				await seedHospitalization(client, {
					hospitalizationId: `hr-${T}-3`,
					systemId,
					entryDate: "2026-01-31 23:59:59",
				});

				const all = await repository.findRecent(
					{ term: `RANGE${T}`, from: "2026-01-01", to: "2026-01-31" },
					20,
				);
				assertEquals(all.map((item) => item.hospitalizationId).sort(), [
					`hr-${T}-1`,
					`hr-${T}-2`,
					`hr-${T}-3`,
				].sort());

				const fromOnly = await repository.findRecent(
					{ term: `RANGE${T}`, from: "2026-01-15" },
					20,
				);
				assertEquals(fromOnly.map((item) => item.hospitalizationId).sort(), [
					`hr-${T}-2`,
					`hr-${T}-3`,
				].sort());

				const toOnly = await repository.findRecent(
					{ term: `RANGE${T}`, to: "2026-01-15" },
					20,
				);
				assertEquals(toOnly.map((item) => item.hospitalizationId).sort(), [
					`hr-${T}-1`,
					`hr-${T}-2`,
				].sort());

				// Um único dia: 00:00:00 do dia incluído, 23:59:59 incluído.
				const sameDay = await repository.findRecent(
					{ term: `RANGE${T}`, from: "2026-01-31", to: "2026-01-31" },
					20,
				);
				assertEquals(sameDay.map((item) => item.hospitalizationId), [`hr-${T}-3`]);
			});

			await t.step("sem termo devolve os mais recentes de todo o histórico", async () => {
				const results = await repository.findRecent({}, 20);

				assertEquals(results.length <= 20, true);
				const dates = results.map((item) => item.entryDate.getTime());
				assertEquals(
					dates.every((value, index) => index === 0 || dates[index - 1] >= value),
					true,
				);
			});

			await t.step("o read model não expõe dados clínicos", async () => {
				const T = token();
				const ownerId = `omin-${T}`;
				const systemId = `smin-${T}`;
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId,
						patientId: `MIN${T}`,
						patientName: "Paciente Min",
						ownerId,
						ownerName: "Tutor Min",
					}),
				);
				await seedHospitalization(client, {
					hospitalizationId: `hmin-${T}`,
					systemId,
					entryDate: "2026-03-01 08:00:00",
				});

				const results = await repository.findRecent({ term: `MIN${T}` }, 20);
				const serialized = JSON.stringify(results);

				assertEquals(Object.keys(results[0]).sort(), [
					"dischargeDate",
					"entryDate",
					"hospitalizationId",
					"ownerId",
					"ownerName",
					"patientId",
					"patientName",
					"status",
					"systemId",
				].sort());

				for (
					const forbidden of [
						"phone",
						"whatsapp",
						"complaints",
						"diagnostics",
						"weight",
						"contact",
					]
				) {
					assertEquals(serialized.includes(forbidden), false, forbidden);
				}
			});
		} finally {
			await cleanup(client, seeded);
			await client.end();
		}
	},
});
