import { assertEquals } from "dev_deps";
import {
	CONTACT_MIGRATION,
	LEGACY_CONTACT_FIXTURE,
} from "../fixtures/hospitalization_contact_migration.fixture.ts";

/**
 * RF-13 — migração do contacto específico por hospitalização.
 *
 * Corre contra a mesma versão do Postgres usada pela aplicação, dentro do
 * container `hospitalizacao-db`, e é ignorada quando o container não está
 * acessível para a suite unitária continuar a correr sem infra.
 */

const DB = "rf13_contact_migration_test";
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
	name: "RF-13 - migração do contacto específico (Postgres)",
	ignore: !available,
	fn: async (t) => {
		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
		await psql(["-q", "-d", "postgres", "-c", `CREATE DATABASE ${DB};`]);
		const fixture = await psql(["-q", "-d", DB], LEGACY_CONTACT_FIXTURE);
		assertEquals(fixture.code, 0, fixture.stderr);

		await t.step("adiciona as três colunas nullable sem tocar nos dados legados", async () => {
			const result = await psql(["-q", "-d", DB], CONTACT_MIGRATION);
			assertEquals(result.code, 0, result.stderr);

			for (const column of ["contact_name", "contact_phone_number", "contact_whatsapp"]) {
				assertEquals(
					await psqlOk(
						`select is_nullable from information_schema.columns where table_name='hospitalizations' and column_name='${column}'`,
					),
					"YES",
					`${column} tem de começar nullable para não quebrar BDs antigas`,
				);
			}

			assertEquals(
				await psqlOk(
					`select count(*) from hospitalizations where contact_name is not null or contact_phone_number is not null or contact_whatsapp is not null`,
				),
				"0",
				"nenhuma hospitalização legada pode ganhar contacto numa migração aditiva",
			);
			assertEquals(await psqlOk(`select count(*) from hospitalizations`), "2");
			assertEquals(await psqlOk(`select count(*) from budgets`), "2");
		});

		await t.step("é idempotente", async () => {
			const again = await psql(["-q", "-d", DB], CONTACT_MIGRATION);
			assertEquals(again.code, 0, again.stderr);
			assertEquals(
				await psqlOk(
					`select count(*) from information_schema.columns where table_name='hospitalizations' and column_name like 'contact_%'`,
				),
				"3",
			);
		});

		await t.step("grava uma excepção completa sem alterar o tutor", async () => {
			const before = await psqlOk(`select name||'|'||phone_number||'|'||whatsapp from owners`);
			await psqlOk(
				`update hospitalizations set contact_name='Maria José', contact_phone_number='923456789', contact_whatsapp=true where hospitalization_id='h2'`,
			);

			assertEquals(
				await psqlOk(
					`select contact_name||'|'||contact_phone_number||'|'||contact_whatsapp from hospitalizations where hospitalization_id='h2'`,
				),
				"Maria José|923456789|true",
			);
			assertEquals(
				await psqlOk(`select name||'|'||phone_number||'|'||whatsapp from owners`),
				before,
				"a excepção não pode tocar na ficha global do tutor",
			);
		});

		await t.step("recusa uma excepção parcial (só nome ou só WhatsApp)", async () => {
			const partial = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				`update hospitalizations set contact_name='Só Nome' where hospitalization_id='h1'`,
			]);
			assertEquals(partial.code !== 0, true, "a excepção tem de ser completa ou nula");

			const partialBoolean = await psql([
				"-q",
				"-d",
				DB,
				"-c",
				`update hospitalizations set contact_name='X', contact_phone_number='911111111', contact_whatsapp=null where hospitalization_id='h1'`,
			]);
			assertEquals(partialBoolean.code !== 0, true);
			assertEquals(
				await psqlOk(
					`select count(*) from hospitalizations where contact_name is not null and hospitalization_id='h1'`,
				),
				"0",
			);
		});

		await psql(["-q", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${DB};`]);
	},
});
