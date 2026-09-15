import { assertEquals } from "dev_deps";
import {
	LEGACY_REPORTS_FIXTURE,
	REPORTS_MIGRATION,
} from "../fixtures/reports_hospitalization_migration.fixture.ts";

/**
 * RF-15 — associação dos relatórios à hospitalização, separada em duas
 * migrações fail-safe:
 *
 *  1. link aditivo/idempotente: coluna nullable + FK RESTRICT + índice, sem
 *     tocar nos relatórios legados. Permite que TODO relatório novo seja
 *     gravado já associado ao episódio activo.
 *  2. backfill + NOT NULL: aborta com diagnóstico e ZERO alterações enquanto
 *     existirem relatórios impossíveis/ambíguos (classificação manual).
 *
 * Corre contra o Postgres do container `hospitalizacao-db` e é ignorado quando
 * não está acessível.
 */

const DB = "rf15_reports_migration_test";
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
	name: "RF-15 - migração dos relatórios por hospitalização (Postgres)",
	ignore: !available,
	fn: async (t) => {
		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
		await psql(["-q", "-d", "postgres", "-c", `CREATE DATABASE ${DB};`]);
		const fixture = await psql(["-q", "-d", DB], LEGACY_REPORTS_FIXTURE);
		assertEquals(fixture.code, 0, fixture.stderr);

		await t.step(
			"o link aditivo cria coluna nullable, FK RESTRICT e índice sem tocar no legado",
			async () => {
				const result = await psql(["-q", "-d", DB], REPORTS_MIGRATION.link);
				assertEquals(result.code, 0, result.stderr);

				assertEquals(
					await psqlOk(
						`select is_nullable from information_schema.columns where table_name='reports' and column_name='hospitalization_id'`,
					),
					"YES",
					"a coluna tem de começar nullable para conviver com o histórico",
				);
				assertEquals(
					await psqlOk(
						`select confdeltype from pg_constraint where conname='fk_reports_hospitalizations'`,
					),
					"r",
					"a FK tem de ser RESTRICT para preservar o histórico",
				);
				assertEquals(
					await psqlOk(
						`select count(*) from pg_indexes where indexname='idx_reports_hospitalization_created_at'`,
					),
					"1",
				);
				assertEquals(
					await psqlOk(
						`select count(*) from reports where hospitalization_id is not null`,
					),
					"0",
					"nenhum relatório legado pode ser associado pela migração aditiva",
				);
				assertEquals(await psqlOk(`select count(*) from reports`), "4");
			},
		);

		await t.step("o link aditivo é idempotente", async () => {
			const again = await psql(["-q", "-d", DB], REPORTS_MIGRATION.link);
			assertEquals(again.code, 0, again.stderr);
			assertEquals(
				await psqlOk(
					`select count(*) from information_schema.columns where table_name='reports' and column_name='hospitalization_id'`,
				),
				"1",
			);
		});

		await t.step("normaliza uma FK pré-existente com regra errada (CASCADE)", async () => {
			await psqlOk(`ALTER TABLE reports DROP CONSTRAINT fk_reports_hospitalizations`);
			await psqlOk(
				`ALTER TABLE reports ADD CONSTRAINT fk_reports_hospitalizations FOREIGN KEY (hospitalization_id) REFERENCES hospitalizations(hospitalization_id) ON DELETE CASCADE`,
			);
			assertEquals(
				await psqlOk(
					`select confdeltype from pg_constraint where conname='fk_reports_hospitalizations'`,
				),
				"c",
			);

			const result = await psql(["-q", "-d", DB], REPORTS_MIGRATION.link);
			assertEquals(result.code, 0, result.stderr);
			assertEquals(
				await psqlOk(
					`select confdeltype from pg_constraint where conname='fk_reports_hospitalizations'`,
				),
				"r",
				"a migração tem de corrigir a regra para RESTRICT",
			);
		});

		await t.step(
			"um relatório novo é gravado associado mesmo com o histórico a NULL",
			async () => {
				// O dump real tem 780 relatórios sem associação; a operação corrente
				// não pode ficar refém da classificação manual.
				await psqlOk(
					`INSERT INTO reports (report_id,state_of_consciousness,food_types,food_level,food_date,comments,created_at,system_id,hospitalization_id)
					 VALUES ('rp_new','"alerta"','"racao"','A','2026-01-11 10:00:00','novo','2026-01-11 10:00:00','p1','h1')`,
				);

				assertEquals(
					await psqlOk(
						`select hospitalization_id from reports where report_id='rp_new'`,
					),
					"h1",
				);
				assertEquals(
					await psqlOk(
						`select count(*) from reports where hospitalization_id is null`,
					),
					"4",
					"o histórico continua a NULL",
				);
			},
		);

		await t.step("apagar uma hospitalização com relatórios é bloqueado pela FK", async () => {
			const attempt = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				`DELETE FROM hospitalizations WHERE hospitalization_id='h1'`,
			]);
			assertEquals(attempt.code !== 0, true, "o delete devia ser bloqueado");
			assertEquals(
				attempt.stderr.includes("fk_reports_hospitalizations"),
				true,
				attempt.stderr,
			);
		});

		await t.step(
			"o backfill ABORTA com diagnóstico diante de impossíveis/ambíguos, sem alterar nada",
			async () => {
				const result = await psql(["-d", DB], REPORTS_MIGRATION.backfill);
				assertEquals(result.code !== 0, true, "o backfill devia abortar");
				assertEquals(result.stderr.includes("1 relatórios ambíguos"), true, result.stderr);
				assertEquals(
					result.stderr.includes("2 fora do intervalo temporal exacto"),
					true,
					result.stderr,
				);
				assertEquals(
					result.stderr.includes("AMBIGUA report=rp_ambig"),
					true,
					result.stderr,
				);
				assertEquals(
					result.stderr.includes("IMPOSSIVEL report=rp_orphan"),
					true,
					result.stderr,
				);
				assertEquals(
					result.stderr.includes("IMPOSSIVEL report=rp_day"),
					true,
					"relatório antes da hora de entrada não pode ser associado por ser o mesmo dia",
				);

				assertEquals(
					await psqlOk(`select count(*) from reports where hospitalization_id is null`),
					"4",
					"nenhum relatório pode ter sido alterado",
				);
				assertEquals(
					await psqlOk(
						`select is_nullable from information_schema.columns where table_name='reports' and column_name='hospitalization_id'`,
					),
					"YES",
					"o NOT NULL não pode ser aplicado quando a migração falha",
				);
			},
		);

		await t.step(
			"após resolver os casos problemáticos o backfill associa tudo e impõe NOT NULL",
			async () => {
				await psqlOk(`DELETE FROM reports WHERE report_id IN ('rp_ambig','rp_orphan')`);
				// o operador corrigiu a hora do relatório para dentro do intervalo exacto
				await psqlOk(
					`UPDATE reports SET created_at='2026-02-02 10:00:00' WHERE report_id='rp_day'`,
				);
				const result = await psql(["-q", "-d", DB], REPORTS_MIGRATION.backfill);
				assertEquals(result.code, 0, result.stderr);

				assertEquals(
					await psqlOk(
						`select hospitalization_id from reports where report_id='rp_strict'`,
					),
					"h1",
				);
				assertEquals(
					await psqlOk(`select hospitalization_id from reports where report_id='rp_day'`),
					"h2",
					"só é associado depois de a data passar a cair no intervalo exacto",
				);
				assertEquals(
					await psqlOk(
						`select is_nullable from information_schema.columns where table_name='reports' and column_name='hospitalization_id'`,
					),
					"NO",
				);
			},
		);

		await t.step(
			"o backfill é idempotente quando já não há relatórios por associar",
			async () => {
				const again = await psql(["-q", "-d", DB], REPORTS_MIGRATION.backfill);
				assertEquals(again.code, 0, again.stderr);
				assertEquals(
					await psqlOk(`select count(*) from reports where hospitalization_id is null`),
					"0",
				);
			},
		);

		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
	},
});
