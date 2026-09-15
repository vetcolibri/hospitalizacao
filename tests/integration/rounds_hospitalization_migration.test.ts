import { assertEquals } from "dev_deps";
import { LEGACY_FIXTURE, MIGRATION } from "../fixtures/rounds_hospitalization_migration.fixture.ts";

/**
 * RF-15 / RF-16 — Fase 1
 *
 * Testa as migrações de Postgres contra uma base de dados deiscartável criada
 * dentro do container `hospitalizacao-db` (mesma versão do servidor de produção).
 * Corre pelo socket local do container, portanto não precisa nem mostra credenciais.
 *
 * É ignorado quando o container não está acessível, para que a suite unitária
 * continue a correr sem infra.
 */

const DB = "rf15_rounds_migration_test";
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

async function psqlOk(sql: string, database = DB): Promise<string> {
	const result = await psql(["-q", "-tA", "-d", database, "-c", sql]);
	if (result.code !== 0) throw new Error(`psql falhou: ${result.stderr}`);
	return result.stdout.trim();
}

async function counts(database = DB): Promise<string> {
	return await psqlOk(
		`select (select count(*) from hospitalizations)||'|'||
        (select count(*) from rounds)||'|'||
        (select count(*) from measurements)||'|'||
        (select count(*) from reports)||'|'||
        (select count(*) from budgets)`,
		database,
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
	name: "Round hospitalization migrations (Postgres)",
	ignore: !available,
	fn: async (t) => {
		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
		await psql(["-q", "-d", "postgres", "-c", `CREATE DATABASE ${DB};`]);
		const fixture = await psql(["-q", "-d", DB], LEGACY_FIXTURE);
		assertEquals(fixture.code, 0, fixture.stderr);

		await t.step(
			"a migração de link adiciona coluna nullable, FK RESTRICT e índices",
			async () => {
				const result = await psql(["-q", "-d", DB], MIGRATION.link);
				assertEquals(result.code, 0, result.stderr);

				assertEquals(
					await psqlOk(
						`select is_nullable from information_schema.columns where table_name='rounds' and column_name='hospitalization_id'`,
					),
					"YES",
					"a coluna tem de começar nullable para não quebrar BDs antigas",
				);
				assertEquals(
					await psqlOk(
						`select confdeltype from pg_constraint where conname='fk_rounds_hospitalizations'`,
					),
					"r",
					"a FK tem de ser RESTRICT para proteger o histórico (RF-16)",
				);
				for (
					const index of [
						"idx_hospitalizations_patient_entry_date",
						"idx_rounds_hospitalization",
						"idx_reports_hospitalization_created_at",
						"idx_budgets_hospitalization",
					]
				) {
					assertEquals(
						await psqlOk(`select count(*) from pg_indexes where indexname='${index}'`),
						"1",
						index,
					);
				}
			},
		);

		await t.step("a migração de link é idempotente", async () => {
			const again = await psql(["-q", "-d", DB], MIGRATION.link);
			assertEquals(again.code, 0, again.stderr);
		});

		await t.step(
			"o backfill FALHA com diagnóstico diante de associação ambígua ou impossível",
			async () => {
				const result = await psql(["-d", DB], MIGRATION.backfill);
				assertEquals(result.code !== 0, true, "o backfill devia abortar");
				assertEquals(result.stderr.includes("1 rondas ambíguas"), true, result.stderr);
				assertEquals(
					result.stderr.includes("2 fora do intervalo temporal exacto"),
					true,
					result.stderr,
				);
				assertEquals(result.stderr.includes("AMBIGUA round=r_ambig"), true, result.stderr);
				assertEquals(
					result.stderr.includes("IMPOSSIVEL round=r_orphan"),
					true,
					result.stderr,
				);
				assertEquals(
					result.stderr.includes("IMPOSSIVEL round=r_day"),
					true,
					"medição antes da hora de entrada não pode ser associada por ser o mesmo dia",
				);

				assertEquals(
					await psqlOk(
						`select count(*) from rounds where hospitalization_id is not null`,
					),
					"0",
					"nenhuma ronda pode ter sido alterada",
				);
				assertEquals(
					await psqlOk(
						`select is_nullable from information_schema.columns where table_name='rounds' and column_name='hospitalization_id'`,
					),
					"YES",
					"o NOT NULL não pode ser aplicado quando a migração falha",
				);
			},
		);

		await t.step(
			"após resolver os casos problemáticos o backfill associa tudo e impõe NOT NULL",
			async () => {
				await psqlOk(`DELETE FROM rounds WHERE round_id IN ('r_ambig','r_orphan')`);
				// o operador corrigiu a hora da medição para dentro do intervalo exacto
				await psqlOk(
					`UPDATE measurements SET issued_at='2026-02-02 10:00:00' WHERE round_id='r_day'`,
				);
				const result = await psql(["-q", "-d", DB], MIGRATION.backfill);
				assertEquals(result.code, 0, result.stderr);

				assertEquals(
					await psqlOk(`select hospitalization_id from rounds where round_id='r_strict'`),
					"h1",
				);
				assertEquals(
					await psqlOk(`select hospitalization_id from rounds where round_id='r_day'`),
					"h2",
					"só é associada depois de a medição passar a cair no intervalo exacto",
				);
				assertEquals(
					await psqlOk(
						`select hospitalization_id from rounds where round_id='r_timeonly'`,
					),
					"h2",
					"medição dentro do intervalo exacto tem de ser associada",
				);
				assertEquals(
					await psqlOk(
						`select is_nullable from information_schema.columns where table_name='rounds' and column_name='hospitalization_id'`,
					),
					"NO",
				);
			},
		);

		await t.step("o backfill é idempotente quando já não há rondas por associar", async () => {
			const again = await psql(["-q", "-d", DB], MIGRATION.backfill);
			assertEquals(again.code, 0, again.stderr);
			assertEquals(
				await psqlOk(`select count(*) from rounds where hospitalization_id is null`),
				"0",
			);
		});

		await t.step("encerrar uma hospitalização não elimina histórico (RF-16)", async () => {
			const before = await counts();
			await psqlOk(
				`UPDATE hospitalizations SET status='Fechada', discharge_date='2026-01-12 18:00:00' WHERE hospitalization_id='h1'`,
			);
			assertEquals(
				await counts(),
				before,
				"encerrar é um UPDATE: nenhuma contagem pode mudar",
			);
			assertEquals(
				await psqlOk(
					`select discharge_date::text from hospitalizations where hospitalization_id='h1'`,
				),
				"2026-01-12 18:00:00",
				"a data de alta tem de ficar persistida",
			);
		});

		await t.step("apagar uma hospitalização com rondas é bloqueado pela FK", async () => {
			const attempt = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				`DELETE FROM hospitalizations WHERE hospitalization_id='h1'`,
			]);
			assertEquals(attempt.code !== 0, true, "o delete devia ser bloqueado");
			assertEquals(
				attempt.stderr.includes("fk_rounds_hospitalizations"),
				true,
				attempt.stderr,
			);
			assertEquals(
				await psqlOk(`select count(*) from rounds where hospitalization_id='h1'`),
				"1",
			);
		});

		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
	},
});
