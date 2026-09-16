import { assertEquals, assertNotEquals } from "dev_deps";
import { LEGACY_CHAIN_FIXTURE } from "../fixtures/migrations_chain.fixture.ts";

/**
 * Testa o script `migrate.sh` contra Postgres real, numa base DESCARTÁVEL
 * (nunca contra `cvl_hospitalizacao`):
 *  - corre de qualquer cwd, resolvendo as migrations pela localização do script;
 *  - aplica aditivas/hardening ANTES dos backfills;
 *  - é idempotente e o resultado final tem NOT NULL e FKs RESTRICT;
 *  - se um backfill recusa legado ambíguo/impossível, sai não-zero apontando ao
 *    README de classificação e não tenta o backfill seguinte;
 *  - nunca imprime o URL/credenciais;
 *  - argumentos inválidos falham sem ligar a nenhuma base.
 */

const DATABASE_URL = Deno.env.get("TEST_DATABASE_URL") ?? "";
const IGNORE_REASON = "Define TEST_DATABASE_URL para correr o migrate.sh contra o Postgres.";

const DB = "migrate_script_test";
const CONTAINER = "hospitalizacao-db";
const SCRIPT = new URL("../../migrate.sh", import.meta.url).pathname;

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

function disposableUrl(): string {
	const url = new URL(DATABASE_URL);
	url.pathname = `/${DB}`;
	return url.toString();
}

/** Corre o script a partir de OUTRO cwd, para provar a resolução relativa. */
async function runScript(args: string[]): Promise<PsqlResult> {
	const output = await new Deno.Command(SCRIPT, {
		args,
		cwd: "/tmp",
		stdout: "piped",
		stderr: "piped",
	}).output();

	return {
		code: output.code,
		stdout: new TextDecoder().decode(output.stdout),
		stderr: new TextDecoder().decode(output.stderr),
	};
}

async function recreateDisposableDb(extraSql?: string): Promise<void> {
	await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
	await psql(["-q", "-d", "postgres", "-c", `CREATE DATABASE ${DB};`]);
	const fixture = await psql(["-q", "-d", DB], LEGACY_CHAIN_FIXTURE);
	assertEquals(fixture.code, 0, fixture.stderr);

	if (extraSql) {
		const extra = await psql(["-q", "-d", DB], extraSql);
		assertEquals(extra.code, 0, extra.stderr);
	}
}

const available = DATABASE_URL !== "";

Deno.test({
	name: "migrate.sh aplica a cadeia, é idempotente e não expõe o URL",
	ignore: !available,
	ignoreReason: IGNORE_REASON,
	fn: async (t) => {
		await recreateDisposableDb();
		const url = disposableUrl();
		const password = new URL(DATABASE_URL).password;

		await t.step("corre uma vez com sucesso e sem imprimir o URL", async () => {
			const result = await runScript([url]);

			assertEquals(result.code, 0, `stderr: ${result.stderr}`);
			const output = result.stdout + result.stderr;
			assertEquals(output.includes(url), false, "o URL completo não pode aparecer na saída");
			if (password.length > 0) {
				assertEquals(output.includes(password), false, "a password não pode aparecer na saída");
			}
		});

		await t.step("aplica aditivas/hardening antes dos backfills", async () => {
			const result = await runScript([url]);
			const out = result.stdout;

			const order = [
				"20260626_associate_reports_hospitalizations.sql",
				"20260915_add_rounds_hospitalization_link.sql",
				"20260916_add_hospitalization_contact.sql",
				"20260916_harden_history_fks.sql",
				"20260626_backfill_reports_hospitalization.sql",
				"20260915_backfill_rounds_hospitalization.sql",
			].map((file) => out.indexOf(file));

			assertEquals(order.every((index) => index >= 0), true, `saída: ${out}`);
			for (let i = 1; i < order.length; i++) {
				assertEquals(order[i] > order[i - 1], true, "ordem operacional errada");
			}
		});

		await t.step("resultado final tem associações, NOT NULL e FKs RESTRICT", async () => {
			assertEquals(
				await psqlOk(
					"SELECT string_agg(report_id || ':' || hospitalization_id, ',' ORDER BY report_id) FROM reports",
				),
				"rp1:h1,rp2:h2",
			);
			assertEquals(
				await psqlOk(
					"SELECT string_agg(round_id || ':' || hospitalization_id, ',' ORDER BY round_id) FROM rounds",
				),
				"rd1:h1,rd2:h2",
			);
			assertEquals(
				await psqlOk(
					"SELECT is_nullable FROM information_schema.columns WHERE table_name='reports' AND column_name='hospitalization_id'",
				),
				"NO",
			);
			assertEquals(
				await psqlOk(
					"SELECT is_nullable FROM information_schema.columns WHERE table_name='rounds' AND column_name='hospitalization_id'",
				),
				"NO",
			);
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

		await t.step("reexecutar é idempotente", async () => {
			const result = await runScript([url]);
			assertEquals(result.code, 0, `stderr: ${result.stderr}`);

			assertEquals(await psqlOk("SELECT count(*) FROM reports WHERE hospitalization_id IS NULL"), "0");
			assertEquals(await psqlOk("SELECT count(*) FROM rounds WHERE hospitalization_id IS NULL"), "0");
		});
	},
});

Deno.test({
	name: "migrate.sh recusa legado ambíguo/impossível sem o forçar",
	ignore: !available,
	ignoreReason: IGNORE_REASON,
	fn: async (t) => {
		// rp_bad fica fora do intervalo de qualquer internamento -> impossível.
		await recreateDisposableDb(`
			INSERT INTO reports (report_id, state_of_consciousness, food_types, food_level, food_date, comments, created_at, system_id)
			VALUES ('rp_bad','["alerta"]','["racao"]','A','2020-01-01 00:00:00','x','2020-01-01 00:00:00','sys1');
		`);

		const url = disposableUrl();
		const password = new URL(DATABASE_URL).password;

		await t.step("sai não-zero e aponta para o README de classificação", async () => {
			const result = await runScript([url]);

			assertNotEquals(result.code, 0);
			const output = result.stdout + result.stderr;
			assertEquals(output.includes("tools/legacy_classification/README.md"), true);
			if (password.length > 0) {
				assertEquals(output.includes(password), false);
			}
		});

		await t.step("aditivas ficaram aplicadas mas nenhum backfill escreveu", async () => {
			// As aditivas/hardening correm antes e são idempotentes.
			assertEquals(
				await psqlOk(
					"SELECT confdeltype::text FROM pg_constraint WHERE conname = 'fk_budgets_hospitalizations'",
				),
				"r",
			);

			// O backfill de relatórios abortou e o de rondas NÃO foi tentado.
			assertEquals(await psqlOk("SELECT count(*) FROM reports WHERE hospitalization_id IS NULL"), "3");
			assertEquals(await psqlOk("SELECT count(*) FROM rounds WHERE hospitalization_id IS NULL"), "2");
		});
	},
});

Deno.test({
	name: "migrate.sh valida argumentos sem ligar a nenhuma base",
	ignore: false,
	fn: async (t) => {
		await t.step("zero argumentos é erro de uso", async () => {
			const result = await runScript([]);
			assertEquals(result.code, 2);
		});

		await t.step("dois argumentos é erro de uso", async () => {
			const result = await runScript(["postgresql://a:b@127.0.0.1:1/x", "extra"]);
			assertEquals(result.code, 2);
		});

		await t.step("scheme inválido falha sem expor credenciais", async () => {
			const result = await runScript(["mysql://user:secret-value@host:3306/db"]);
			assertEquals(result.code, 2);
			assertEquals((result.stdout + result.stderr).includes("secret-value"), false);
		});
	},
});
