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
 *  - revalida o mapping contra os factos ACTUAIS da base de dados (um export
 *    antigo não serve para aplicar);
 *  - exige `approved: true` e rejeita qualquer problema do validador;
 *  - por defeito só mostra o plano (dry-run), sem escrever;
 *  - com `--apply`, corre numa única transacção e só actualiza registos ainda
 *    com `hospitalization_id IS NULL`; qualquer contagem inesperada faz ROLLBACK;
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

async function applyUpdates(client: Client, updates: PlannedUpdate[]): Promise<void> {
	await client.queryArray("BEGIN");

	try {
		for (const update of updates) {
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

		await client.queryArray("COMMIT");
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

	try {
		const mapping = readMapping(mappingPath);

		await client.connect();
		const facts = await readLegacyFacts(client);

		const plan = planApplication(mapping, facts.records, facts.hospitalizations, new Date());

		if (plan.issues.length > 0) {
			console.error(JSON.stringify({ status: "REFUSED", issues: plan.issues }, null, 2));
			Deno.exit(1);
		}

		if (!apply) {
			console.log(JSON.stringify({
				status: "DRY_RUN",
				updates: plan.updates.length,
				plan: plan.updates,
				hint: "Sem escrita. Repetir com --apply depois de aprovar.",
			}, null, 2));
			Deno.exit(0);
		}

		await applyUpdates(client, plan.updates);

		console.log(JSON.stringify({
			status: "APPLIED",
			updates: plan.updates.length,
		}, null, 2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		Deno.exit(1);
	} finally {
		await client.end();
	}
}
