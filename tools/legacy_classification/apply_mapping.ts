import { Client } from "deps";
import { readLegacyFacts } from "./facts.ts";
import {
	type HospitalizationFact,
	type LegacyMapping,
	type LegacyRecordFact,
	validateMapping,
	type ValidationIssue,
} from "./validator.ts";

/**
 * Aplicação do mapping manual do legado (RF-15/RF-16).
 *
 *   deno run -A tools/legacy_classification/apply_mapping.ts <mapping.json>          # dry-run
 *   deno run -A tools/legacy_classification/apply_mapping.ts <mapping.json> --apply  # escreve
 *
 * Regras de segurança:
 *  - a leitura dos factos, a validação e TODOS os UPDATEs correm na MESMA
 *    transacção `SERIALIZABLE`, aberta ANTES de ler. Não há janela TOCTOU entre
 *    validar e escrever;
 *  - o dry-run NÃO escreve: termina sempre com `ROLLBACK`;
 *  - qualquer problema de validação ou erro termina com `ROLLBACK`;
 *  - com `--apply`, só actualiza linhas ainda com `hospitalization_id IS NULL`;
 *    se algum `UPDATE` não afectar exactamente 1 linha, faz `ROLLBACK`;
 *  - nunca adivinha associações.
 */

export interface PlannedUpdate {
	record_type: "round" | "report";
	record_id: string;
	hospitalization_id: string;
}

export interface ApplicationPlan {
	issues: ValidationIssue[];
	updates: PlannedUpdate[];
}

export function planApplication(
	mapping: LegacyMapping,
	records: LegacyRecordFact[],
	hospitalizations: HospitalizationFact[],
	asOf: Date,
): ApplicationPlan {
	const issues = validateMapping(mapping, records, hospitalizations, {
		asOf,
		requireApproved: true,
	});

	if (issues.length > 0) return { issues, updates: [] };

	return {
		issues: [],
		updates: mapping.entries.map((entry) => ({
			record_type: entry.record_type,
			record_id: entry.record_id,
			hospitalization_id: entry.hospitalization_id,
		})),
	};
}

export type ApplicationResult =
	| { status: "REFUSED"; issues: ValidationIssue[] }
	| { status: "DRY_RUN"; updates: PlannedUpdate[] }
	| { status: "APPLIED"; updates: PlannedUpdate[] };

async function updateLegacyRecord(client: Client, update: PlannedUpdate): Promise<void> {
	const table = update.record_type === "round" ? "rounds" : "reports";
	const idColumn = update.record_type === "round" ? "round_id" : "report_id";

	const result = await client.queryObject<{ id: string }>(
		`UPDATE ${table} SET hospitalization_id = $1
		 WHERE ${idColumn} = $2 AND hospitalization_id IS NULL
		 RETURNING ${idColumn} AS id`,
		[update.hospitalization_id, update.record_id],
	);

	if (result.rows.length !== 1) {
		throw new Error(
			`UPDATE inesperado para ${update.record_type} ${update.record_id}: ` +
				`esperava 1 linha por classificar, obteve ${result.rows.length}.`,
		);
	}
}

/**
 * Lê, valida e (se `apply` e tudo ok) escreve na mesma transacção serializável.
 * Devolve o resultado; nunca deixa uma transacção aberta.
 */
export async function applyMapping(
	client: Client,
	mapping: LegacyMapping,
	asOf: Date,
	apply: boolean,
): Promise<ApplicationResult> {
	await client.queryArray("BEGIN ISOLATION LEVEL SERIALIZABLE");

	try {
		// Leitura + validação DENTRO da transacção: os factos que validam são
		// exactamente os que os UPDATEs vão encontrar.
		const facts = await readLegacyFacts(client);
		const plan = planApplication(mapping, facts.records, facts.hospitalizations, asOf);

		if (plan.issues.length > 0) {
			await client.queryArray("ROLLBACK");
			return { status: "REFUSED", issues: plan.issues };
		}

		if (!apply) {
			await client.queryArray("ROLLBACK");
			return { status: "DRY_RUN", updates: plan.updates };
		}

		for (const update of plan.updates) {
			await updateLegacyRecord(client, update);
		}

		await client.queryArray("COMMIT");
		return { status: "APPLIED", updates: plan.updates };
	} catch (error) {
		await client.queryArray("ROLLBACK");
		throw error;
	}
}

function readMapping(path: string): LegacyMapping {
	const raw = Deno.readTextFileSync(path);
	return JSON.parse(raw) as LegacyMapping;
}

if (import.meta.main) {
	const [mappingPath, ...flags] = Deno.args;
	const apply = flags.includes("--apply");

	if (!mappingPath) {
		console.error("Uso: apply_mapping.ts <mapping.json> [--apply]");
		Deno.exit(1);
	}

	const url = Deno.env.get("DATABASE_URL");
	if (!url) {
		console.error("DATABASE_URL é obrigatório.");
		Deno.exit(1);
	}

	const client = new Client(url);
	let exitCode = 0;

	try {
		const mapping = readMapping(mappingPath);

		await client.connect();
		const result = await applyMapping(client, mapping, new Date(), apply);

		if (result.status === "REFUSED") {
			console.error(JSON.stringify({ status: "REFUSED", issues: result.issues }, null, 2));
			exitCode = 1;
		} else if (result.status === "DRY_RUN") {
			console.log(JSON.stringify({
				status: "DRY_RUN",
				updates: result.updates.length,
				plan: result.updates,
				hint: "Sem escrita. Repetir com --apply depois de aprovar.",
			}, null, 2));
		} else {
			console.log(JSON.stringify({ status: "APPLIED", updates: result.updates.length }, null, 2));
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		exitCode = 1;
	} finally {
		await client.end();
	}

	Deno.exit(exitCode);
}
