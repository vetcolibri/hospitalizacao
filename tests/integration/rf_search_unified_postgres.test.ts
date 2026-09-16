import { assertEquals } from "dev_deps";
import { Client } from "deps";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";

/**
 * Pesquisa unificada contra o Postgres real: ranking, prioridade de campos,
 * case-insensitivity, literalidade de `%`/`_` e limite de 10. As linhas são
 * sintéticas (tokens aleatórios) e removidas no fim; nunca se carrega a tabela
 * toda.
 *
 * Requer a base de desenvolvimento a correr:
 *   TEST_DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:54330/cvl_hospitalizacao \
 *     deno test --no-check --allow-all tests/integration/rf_search_unified_postgres.test.ts
 */
const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON = "Define TEST_DATABASE_URL para correr a pesquisa real no Postgres.";

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
	return `zq${crypto.randomUUID().replaceAll("-", "").substring(0, 6)}${seq}`;
}

interface SeededPatient {
	systemId: string;
	ownerId: string;
}

async function seedOwnerAndPatient(
	client: Client,
	input: {
		ownerId?: string;
		ownerName: string;
		systemId: string;
		patientId: string;
		patientName: string;
		status?: string;
	},
): Promise<SeededPatient> {
	const ownerId = input.ownerId ?? `o-${input.systemId}`;
	await client.queryObject(
		"INSERT INTO owners (owner_id, name, phone_number, whatsapp) VALUES ($1, $2, $3, $4)",
		[ownerId, input.ownerName, "923000000", false],
	);
	await client.queryObject(
		"INSERT INTO patients (system_id, patient_id, name, specie, breed, status, birth_date, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		[
			input.systemId,
			input.patientId,
			input.patientName,
			"CANINO",
			"bulldog",
			input.status ?? "HOSPITALIZADO",
			"2013-07-01",
			ownerId,
		],
	);
	return { systemId: input.systemId, ownerId };
}

async function cleanup(client: Client, seeded: SeededPatient[]): Promise<void> {
	for (const item of seeded) {
		await client.queryObject("DELETE FROM patients WHERE system_id = $1", [item.systemId]);
		await client.queryObject("DELETE FROM owners WHERE owner_id = $1", [item.ownerId]);
	}
}

Deno.test({
	name: "pesquisa unificada - ranking no Postgres real",
	ignore: !DB_AVAILABLE,
	ignoreReason: IGNORE_REASON,
	fn: async (t) => {
		const client = await connect();
		if (!client) throw new Error("Ligação indisponível");
		const repository = new PostgresPatientRepository(client);
		const seeded: SeededPatient[] = [];

		try {
			await t.step("exacto > prefixo > parcial", async () => {
				const T = token();
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId: `s-${T}-1`,
						patientId: T,
						patientName: "Nome Um",
						ownerId: `o1-${T}`,
						ownerName: "Tutor Um",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `s-${T}-2`,
						patientId: `${T}-EXTRA`,
						patientName: "Nome Dois",
						ownerId: `o2-${T}`,
						ownerName: "Tutor Dois",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `s-${T}-3`,
						patientId: `AAA-${T}-BBB`,
						patientName: "Nome Três",
						ownerId: `o3-${T}`,
						ownerName: "Tutor Três",
					}),
				);

				const results = await repository.search(T, 10);

				assertEquals(
					results.map((item) => item.patient.systemId.value),
					[`s-${T}-1`, `s-${T}-2`, `s-${T}-3`],
				);
			});

			await t.step("empate desempata por ID paciente > ID tutor > nome paciente > nome tutor", async () => {
				const T = token();
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId: `p-${T}`,
						patientId: T,
						patientName: "Nome A",
						ownerId: `oa-${T}`,
						ownerName: "Tutor A",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `oid-${T}`,
						patientId: `P-${T}`,
						patientName: "Nome B",
						ownerId: T,
						ownerName: "Tutor B",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `pn-${T}`,
						patientId: `P2-${T}`,
						patientName: T.toUpperCase(),
						ownerId: `oc-${T}`,
						ownerName: "Tutor C",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `on-${T}`,
						patientId: `P3-${T}`,
						patientName: "Nome D",
						ownerId: `od-${T}`,
						ownerName: T.toUpperCase(),
					}),
				);

				const results = await repository.search(T, 10);

				assertEquals(
					results.map((item) => item.patient.systemId.value),
					[`p-${T}`, `oid-${T}`, `pn-${T}`, `on-${T}`],
				);
			});

			await t.step("case-insensitive e com trim", async () => {
				const T = token();
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId: `ci-${T}`,
						patientId: T.toUpperCase(),
						patientName: "Nome CI",
						ownerId: `oci-${T}`,
						ownerName: "Tutor CI",
					}),
				);

				const results = await repository.search(`   ${T}   `, 10);

				assertEquals(results.map((item) => item.patient.systemId.value), [`ci-${T}`]);
			});

			await t.step("percentagem e underscore são literais", async () => {
				const T = token();
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId: `pct-${T}`,
						patientId: `PCT-${T}`,
						patientName: `${T}%x`,
						ownerId: `opct-${T}`,
						ownerName: "Tutor PCT",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `pctwild-${T}`,
						patientId: `PCTW-${T}`,
						patientName: `${T}Qx`,
						ownerId: `opctw-${T}`,
						ownerName: "Tutor PCTW",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `us-${T}`,
						patientId: `US-${T}`,
						patientName: `${T}_y`,
						ownerId: `ous-${T}`,
						ownerName: "Tutor US",
					}),
					await seedOwnerAndPatient(client, {
						systemId: `uswild-${T}`,
						patientId: `USW-${T}`,
						patientName: `${T}Qy`,
						ownerId: `ousw-${T}`,
						ownerName: "Tutor USW",
					}),
				);

				const pct = await repository.search(`${T}%x`, 10);
				assertEquals(pct.map((item) => item.patient.systemId.value), [`pct-${T}`]);

				const us = await repository.search(`${T}_y`, 10);
				assertEquals(us.map((item) => item.patient.systemId.value), [`us-${T}`]);
			});

			await t.step("limita a 10 resultados", async () => {
				const T = token();
				for (let i = 0; i < 12; i++) {
					seeded.push(
						await seedOwnerAndPatient(client, {
							systemId: `lim-${T}-${i}`,
							patientId: `LIM${T}-${String(i).padStart(2, "0")}`,
							patientName: `Nome ${i}`,
							ownerId: `olim-${T}-${i}`,
							ownerName: `Tutor ${i}`,
						}),
					);
				}

				const results = await repository.search(`lim${T}`, 10);

				assertEquals(results.length, 10);
			});

			await t.step("devolve apenas paciente e nome do tutor (sem telefone/WhatsApp)", async () => {
				const T = token();
				seeded.push(
					await seedOwnerAndPatient(client, {
						systemId: `min-${T}`,
						patientId: `MIN-${T}`,
						patientName: "Nome Min",
						ownerId: `omin-${T}`,
						ownerName: "Tutor Min",
					}),
				);

				const results = await repository.search(`min-${T}`, 10);
				const serialized = JSON.stringify(results);

				assertEquals(Object.keys(results[0]), ["patient", "ownerName"]);
				for (const forbidden of ["phoneNumber", "whatsapp", "phone_number"]) {
					assertEquals(serialized.includes(forbidden), false, forbidden);
				}
			});
		} finally {
			await cleanup(client, seeded);
			await client.end();
		}
	},
});
