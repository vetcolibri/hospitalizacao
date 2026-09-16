import { assertEquals } from "dev_deps";
import { Client } from "deps";
import { applyMapping } from "../../tools/legacy_classification/apply_mapping.ts";
import type { LegacyMapping } from "../../tools/legacy_classification/validator.ts";
import { LEGACY_CHAIN_FIXTURE, MIGRATIONS_CHAIN } from "../fixtures/migrations_chain.fixture.ts";

/**
 * Prova, em Postgres real, que a aplicação do mapping do legado é atómica:
 *  - leitura, validação e UPDATEs na mesma transacção SERIALIZABLE;
 *  - dry-run e recusas terminam com ROLLBACK e não escrevem nada;
 *  - uma falha a meio de vários UPDATEs desfaz TUDO (nada de escrita parcial).
 *
 * Usa uma base descartável com as colunas `hospitalization_id` ainda nullable
 * (só as migrations aditivas), para simular o legado por classificar.
 */

const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON = "Define TEST_DATABASE_URL para correr a atomicidade real contra o Postgres.";

const DB = "rf16_apply_mapping_test";
const CONTAINER = "hospitalizacao-db";

interface PsqlResult {
	code: number;
	stdout: string;
	stderr: string;
}

async function psql(args: string[], input?: string): Promise<PsqlResult> {
	const child = new Deno.Command("podman", {
		args: ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", ...args],
		stdin: input === undefined ? "null" : "piped",
		stdout: "piped",
		stderr: "piped",
	}).spawn();

	if (input !== undefined) {
		const writer = child.stdin.getWriter();
		await writer.write(new TextEncoder().encode(input));
		writer.releaseLock();
		child.stdin.close();
	}

	const output = await child.output();
	return {
		code: output.code,
		stdout: new TextDecoder().decode(output.stdout),
		stderr: new TextDecoder().decode(output.stderr),
	};
}

async function disposableClient(): Promise<Client> {
	const base = new URL(DATABASE_URL);
	base.pathname = `/${DB}`;
	const client = new Client(base.toString());
	await client.connect();
	return client;
}

function approvedMapping(): LegacyMapping {
	return {
		version: 1,
		approved: true,
		reviewed_by: "medvet-cvl",
		reviewed_at: new Date(Date.now() - 60_000).toISOString(),
		entries: [
			{ record_type: "round", record_id: "rd1", system_id: "sys1", hospitalization_id: "h1" },
			{ record_type: "round", record_id: "rd2", system_id: "sys1", hospitalization_id: "h2" },
			{ record_type: "report", record_id: "rp1", system_id: "sys1", hospitalization_id: "h1" },
			{ record_type: "report", record_id: "rp2", system_id: "sys1", hospitalization_id: "h2" },
		],
	};
}

async function nulls(client: Client): Promise<{ rounds: number; reports: number }> {
	const result = await client.queryObject<{ rounds: number; reports: number }>(
		`SELECT
			(SELECT count(*)::int FROM rounds  WHERE hospitalization_id IS NULL) AS rounds,
			(SELECT count(*)::int FROM reports WHERE hospitalization_id IS NULL) AS reports`,
	);
	return result.rows[0];
}

/** Wrapper que falha no UPDATE de uma ronda específica, para provar o rollback. */
function clientFailingOn(real: Client, recordId: string): Client {
	return {
		queryArray: (sql: string) => real.queryArray(sql),
		queryObject: (sql: string, params?: unknown) => {
			const isTargetUpdate = typeof sql === "string" &&
				sql.includes("UPDATE rounds") &&
				Array.isArray(params) &&
				params[1] === recordId;

			if (isTargetUpdate) return Promise.reject(new Error("falha simulada a meio da aplicação"));

			return (real.queryObject as (s: string, p?: unknown) => Promise<unknown>)(sql, params);
		},
	} as unknown as Client;
}

const available = DATABASE_URL !== "";

Deno.test({
	name: "apply_mapping é atómico e o dry-run não escreve (Postgres)",
	ignore: !available,
	ignoreReason: IGNORE_REASON,
	fn: async (t) => {
		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
		await psql(["-q", "-d", "postgres", "-c", `CREATE DATABASE ${DB};`]);
		const fixture = await psql(["-q", "-d", DB], LEGACY_CHAIN_FIXTURE);
		assertEquals(fixture.code, 0, fixture.stderr);

		// Só as migrations aditivas: as colunas ficam nullable com o legado NULL.
		for (const file of [
			"20260626_associate_reports_hospitalizations.sql",
			"20260915_add_rounds_hospitalization_link.sql",
		]) {
			const migration = MIGRATIONS_CHAIN.find((item) => item.file === file)!;
			const result = await psql(["-q", "-d", DB], migration.sql);
			assertEquals(result.code, 0, `${file}: ${result.stderr}`);
		}

		const client = await disposableClient();

		try {
			await t.step("estado inicial: 2 rondas e 2 relatórios por classificar", async () => {
				assertEquals(await nulls(client), { rounds: 2, reports: 2 });
			});

			await t.step("dry-run devolve plano e termina com ROLLBACK (nada escrito)", async () => {
				const result = await applyMapping(client, approvedMapping(), new Date(), false);

				assertEquals(result.status, "DRY_RUN");
				assertEquals(await nulls(client), { rounds: 2, reports: 2 });
			});

			await t.step("mapping incompleto é REFUSED sem escrever", async () => {
				const incomplete = approvedMapping();
				incomplete.entries = [incomplete.entries[0]];

				const result = await applyMapping(client, incomplete, new Date(), false);

				assertEquals(result.status, "REFUSED");
				assertEquals(await nulls(client), { rounds: 2, reports: 2 });
			});

			await t.step("falha a meio desfaz os UPDATEs já feitos (rollback total)", async () => {
				let threw = false;
				try {
					await applyMapping(
						clientFailingOn(client, "rd2"),
						approvedMapping(),
						new Date(),
						true,
					);
				} catch {
					threw = true;
				}

				assertEquals(threw, true, "a falha simulada tem de propagar");
				assertEquals(
					await nulls(client),
					{ rounds: 2, reports: 2 },
					"nem a primeira ronda pode ficar actualizada",
				);
			});

			await t.step("aplicação válida associa tudo e confirma", async () => {
				const result = await applyMapping(client, approvedMapping(), new Date(), true);

				assertEquals(result.status, "APPLIED");
				assertEquals(await nulls(client), { rounds: 0, reports: 0 });

				const rounds = await client.queryObject<{ mapping: string }>(
					"SELECT string_agg(round_id || ':' || hospitalization_id, ',' ORDER BY round_id) AS mapping FROM rounds",
				);
				assertEquals(rounds.rows[0].mapping, "rd1:h1,rd2:h2");

				const reports = await client.queryObject<{ mapping: string }>(
					"SELECT string_agg(report_id || ':' || hospitalization_id, ',' ORDER BY report_id) AS mapping FROM reports",
				);
				assertEquals(reports.rows[0].mapping, "rp1:h1,rp2:h2");
			});
		} finally {
			await client.end();
		}
	},
});
