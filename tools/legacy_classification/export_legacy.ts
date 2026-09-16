import { Client } from "deps";
import { type LegacyFacts, readLegacyFacts } from "./facts.ts";
import { candidateHospitalizations } from "./validator.ts";

/**
 * Export READ-ONLY do legado por classificar (RF-15/RF-16).
 *
 * Uso:
 *   DATABASE_URL=postgres://... deno run -A tools/legacy_classification/export_legacy.ts \
 *     > /tmp/legacy_export.json
 *
 * O ficheiro contém apenas identificadores, `system_id`, timestamps e os
 * episódios candidatos/do paciente. NÃO contém nomes, telefones, comentários
 * nem conteúdo clínico. O export real não deve ser commitado (ver README).
 */

export function buildExport(facts: LegacyFacts, asOf: Date) {
	return {
		generated_at: new Date().toISOString(),
		as_of: asOf.toISOString(),
		counts: {
			rounds: facts.records.filter((record) => record.record_type === "round").length,
			reports: facts.records.filter((record) => record.record_type === "report").length,
			total: facts.records.length,
		},
		records: facts.records.map((record) => {
			const patientHospitalizations = facts.hospitalizations.filter(
				(hospitalization) => hospitalization.system_id === record.system_id,
			);

			return {
				record_type: record.record_type,
				record_id: record.record_id,
				system_id: record.system_id,
				starts_at: record.starts_at,
				ends_at: record.ends_at,
				candidates: candidateHospitalizations(record, facts.hospitalizations, asOf).map(
					(hospitalization) => hospitalization.hospitalization_id,
				),
				patient_hospitalizations: patientHospitalizations.map(
					(hospitalization) => hospitalization.hospitalization_id,
				),
			};
		}),
		patient_hospitalizations: facts.hospitalizations.map((hospitalization) => ({
			hospitalization_id: hospitalization.hospitalization_id,
			system_id: hospitalization.system_id,
			entry_date: hospitalization.entry_date,
			discharge_date: hospitalization.discharge_date,
		})),
	};
}

if (import.meta.main) {
	const url = Deno.env.get("DATABASE_URL");
	if (!url) {
		console.error("DATABASE_URL é obrigatório.");
		Deno.exit(1);
	}

	const asOf = new Date();
	const client = new Client(url);

	try {
		await client.connect();
		// Nunca escreve: apenas SELECTs das colunas seguras.
		const facts = await readLegacyFacts(client);
		console.log(JSON.stringify(buildExport(facts, asOf), null, 2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		Deno.exit(1);
	} finally {
		await client.end();
	}
}
