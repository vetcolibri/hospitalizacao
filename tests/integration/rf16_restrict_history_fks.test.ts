import { assertEquals } from "dev_deps";
import {
	HARDEN_HISTORY_FKS_MIGRATION,
	LEGACY_CASCADE_FIXTURE,
} from "../fixtures/history_fks.fixture.ts";

/**
 * RF-16 — integridade do histórico no Postgres real.
 *
 * Eliminar uma hospitalização nunca pode apagar orçamento, rondas/exames ou
 * relatórios em cascata. A migração 20260916 normaliza as três FKs para
 * ON DELETE RESTRICT e este teste prova que o DELETE é bloqueado por cada uma.
 *
 * Corre contra a mesma versão do Postgres usada pela aplicação, dentro do
 * container `hospitalizacao-db`, e é ignorada quando o container não está
 * acessível.
 */

const DB = "rf16_history_fks_test";
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

async function confdeltype(constraint: string): Promise<string> {
	return await psqlOk(
		`SELECT confdeltype FROM pg_constraint WHERE conname = '${constraint}'`,
	);
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
	name: "RF-16 - histórico protegido por FK RESTRICT (Postgres)",
	ignore: !available,
	fn: async (t) => {
		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
		await psql(["-q", "-d", "postgres", "-c", `CREATE DATABASE ${DB};`]);
		const fixture = await psql(["-q", "-d", DB], LEGACY_CASCADE_FIXTURE);
		assertEquals(fixture.code, 0, fixture.stderr);

		await t.step("o estado legado apaga em cascata", async () => {
			assertEquals(await confdeltype("fk_reports_hospitalizations"), "c");
			assertEquals(await confdeltype("fk_rounds_hospitalizations"), "c");
			assertEquals(await confdeltype("fk_budgets_hospitalizations"), "c");
		});

		await t.step("a migração normaliza as três FKs para RESTRICT", async () => {
			const migration = await psql(["-q", "-d", DB], HARDEN_HISTORY_FKS_MIGRATION);
			assertEquals(migration.code, 0, migration.stderr);

			assertEquals(await confdeltype("fk_reports_hospitalizations"), "r");
			assertEquals(await confdeltype("fk_rounds_hospitalizations"), "r");
			assertEquals(await confdeltype("fk_budgets_hospitalizations"), "r");
		});

		await t.step("é idempotente", async () => {
			const migration = await psql(["-q", "-d", DB], HARDEN_HISTORY_FKS_MIGRATION);
			assertEquals(migration.code, 0, migration.stderr);
			assertEquals(await confdeltype("fk_budgets_hospitalizations"), "r");
		});

		await t.step("eliminar a hospitalização é bloqueado por cada filho", async () => {
			const withReport = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				"DELETE FROM hospitalizations WHERE hospitalization_id = 'h-rf16'",
			]);
			assertEquals(withReport.code !== 0, true, "com relatório o delete tem de falhar");

			await psql(["-q", "-d", DB, "-c", "DELETE FROM reports WHERE report_id = 'rep-rf16'"]);

			const withRound = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				"DELETE FROM hospitalizations WHERE hospitalization_id = 'h-rf16'",
			]);
			assertEquals(withRound.code !== 0, true, "com ronda o delete tem de falhar");

			await psql(["-q", "-d", DB, "-c", "DELETE FROM rounds WHERE round_id = 'round-rf16'"]);

			const withBudget = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				"DELETE FROM hospitalizations WHERE hospitalization_id = 'h-rf16'",
			]);
			assertEquals(withBudget.code !== 0, true, "com orçamento o delete tem de falhar");

			await psql(["-q", "-d", DB, "-c", "DELETE FROM budgets WHERE budget_id = 'b-rf16'"]);

			const withoutChildren = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				"DELETE FROM hospitalizations WHERE hospitalization_id = 'h-rf16'",
			]);
			assertEquals(withoutChildren.code, 0, withoutChildren.stderr);

			const remaining = await psqlOk(
				"SELECT count(*) FROM hospitalizations WHERE hospitalization_id = 'h-rf16'",
			);
			assertEquals(remaining, "0");
		});
	},
});
