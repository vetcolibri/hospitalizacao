import { assertEquals } from "dev_deps";
import { LEGACY_CHAIN_FIXTURE, MIGRATIONS_CHAIN } from "../fixtures/migrations_chain.fixture.ts";

/**
 * Auditoria da cadeia/ordem das migrations num restore limpo.
 *
 * Parte de uma base legada (pré-2026-06-26) e aplica TODAS as migrations na
 * ordem canónica, provando que:
 *  - o backfill associa cada registo ao episódio certo;
 *  - o resultado final é consistente (NOT NULL, FKs RESTRICT, colunas de
 *    contacto), igual ao `schema.sql` de uma instalação nova;
 *  - a cadeia é idempotente (pode ser repetida).
 *
 * Corre contra o Postgres real dentro do container `hospitalizacao-db`; é
 * ignorada quando o container não está acessível.
 */

const DB = "migrations_chain_restore_test";
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

async function psqlOk(sql: string): Promise<string> {
	const result = await psql(["-q", "-tA", "-d", DB, "-c", sql]);
	if (result.code !== 0) throw new Error(`psql falhou: ${result.stderr}`);
	return result.stdout.trim();
}

function postgresAvailable(): boolean {
	try {
		const probe = new Deno.Command("podman", {
			args: ["exec", CONTAINER, "pg_isready", "-U", "postgres", "-q"],
			stdout: "null",
			stderr: "null",
		}).outputSync();
		return probe.code === 0;
	} catch {
		return false;
	}
}

const available = postgresAvailable();

Deno.test({
	name: "migrations - restore limpo aplica a cadeia canónica",
	ignore: !available,
	fn: async (t) => {
		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
		await psql(["-q", "-d", "postgres", "-c", `CREATE DATABASE ${DB};`]);
		const fixture = await psql(["-q", "-d", DB], LEGACY_CHAIN_FIXTURE);
		assertEquals(fixture.code, 0, fixture.stderr);

		await t.step("aplica todas as migrations por ordem sem falhar", async () => {
			for (const migration of MIGRATIONS_CHAIN) {
				const result = await psql(["-q", "-d", DB], migration.sql);
				assertEquals(result.code, 0, `${migration.file}: ${result.stderr}`);
			}
		});

		await t.step("cada relatório ficou no episódio correcto e NOT NULL", async () => {
			assertEquals(
				await psqlOk(
					"SELECT string_agg(report_id || ':' || hospitalization_id, ',' ORDER BY report_id) FROM reports",
				),
				"rp1:h1,rp2:h2",
			);
			assertEquals(
				await psqlOk(
					"SELECT is_nullable FROM information_schema.columns WHERE table_name='reports' AND column_name='hospitalization_id'",
				),
				"NO",
			);
		});

		await t.step("cada ronda ficou no episódio correcto e NOT NULL", async () => {
			assertEquals(
				await psqlOk(
					"SELECT string_agg(round_id || ':' || hospitalization_id, ',' ORDER BY round_id) FROM rounds",
				),
				"rd1:h1,rd2:h2",
			);
			assertEquals(
				await psqlOk(
					"SELECT is_nullable FROM information_schema.columns WHERE table_name='rounds' AND column_name='hospitalization_id'",
				),
				"NO",
			);
		});

		await t.step("as três FKs de histórico ficam RESTRICT", async () => {
			for (
				const constraint of [
					"fk_reports_hospitalizations",
					"fk_rounds_hospitalizations",
					"fk_budgets_hospitalizations",
				]
			) {
				assertEquals(
					await psqlOk(
						`SELECT confdeltype::text FROM pg_constraint WHERE conname = '${constraint}'`,
					),
					"r",
				);
			}
		});

		await t.step("as colunas de contacto existem e são nullable", async () => {
			for (const column of ["contact_name", "contact_phone_number", "contact_whatsapp"]) {
				assertEquals(
					await psqlOk(
						`SELECT is_nullable FROM information_schema.columns WHERE table_name='hospitalizations' AND column_name='${column}'`,
					),
					"YES",
				);
			}
		});

		await t.step("a cadeia é idempotente", async () => {
			for (const migration of MIGRATIONS_CHAIN) {
				const result = await psql(["-q", "-d", DB], migration.sql);
				assertEquals(result.code, 0, `${migration.file} (2.ª passagem): ${result.stderr}`);
			}

			assertEquals(await psqlOk("SELECT count(*) FROM reports WHERE hospitalization_id IS NULL"), "0");
			assertEquals(await psqlOk("SELECT count(*) FROM rounds WHERE hospitalization_id IS NULL"), "0");
		});

		await t.step("eliminar uma hospitalização com histórico é bloqueado", async () => {
			const result = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				"DELETE FROM hospitalizations WHERE hospitalization_id = 'h1'",
			]);
			assertEquals(result.code !== 0, true, "o DELETE tinha de ser bloqueado pelas FKs RESTRICT");
		});
	},
});
