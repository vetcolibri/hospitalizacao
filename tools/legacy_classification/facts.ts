import { Client } from "deps";
import type { HospitalizationFact, LegacyRecordFact } from "./validator.ts";

/**
 * Leitura READ-ONLY dos factos necessários para classificar o legado.
 *
 * Devolve apenas identificadores, `system_id` e timestamps. Nunca lê nem
 * devolve nomes, telefones, comentários, estados de consciência, alimentação,
 * descargas ou qualquer conteúdo clínico.
 *
 * Os timestamps são devolvidos como wall-clock em texto
 * (`YYYY-MM-DDTHH:MM:SS`), tal como armazenados nas colunas
 * `timestamp without time zone`. Todas as comparações do validador usam a
 * mesma convenção, por isso são consistentes entre si.
 */

const TIMESTAMP_FORMAT = `'YYYY-MM-DD"T"HH24:MI:SS'`;

export interface LegacyFacts {
	records: LegacyRecordFact[];
	hospitalizations: HospitalizationFact[];
}

export async function readLegacyFacts(client: Client): Promise<LegacyFacts> {
	const rounds = await client.queryObject<{
		record_id: string;
		system_id: string;
		starts_at: string | null;
		ends_at: string | null;
	}>(
		`SELECT
			r.round_id AS record_id,
			r.system_id,
			to_char(min(m.issued_at), ${TIMESTAMP_FORMAT}) AS starts_at,
			to_char(max(m.issued_at), ${TIMESTAMP_FORMAT}) AS ends_at
		FROM rounds r
		LEFT JOIN measurements m ON m.round_id = r.round_id
		WHERE r.hospitalization_id IS NULL
		GROUP BY r.round_id, r.system_id
		ORDER BY r.system_id, r.round_id`,
	);

	const reports = await client.queryObject<{
		record_id: string;
		system_id: string;
		starts_at: string | null;
	}>(
		`SELECT
			report_id AS record_id,
			system_id,
			to_char(created_at, ${TIMESTAMP_FORMAT}) AS starts_at
		FROM reports
		WHERE hospitalization_id IS NULL
		ORDER BY system_id, report_id`,
	);

	const records: LegacyRecordFact[] = [
		...rounds.rows.map((row) => ({
			record_type: "round" as const,
			record_id: row.record_id,
			system_id: row.system_id,
			starts_at: row.starts_at ?? "",
			ends_at: row.ends_at ?? "",
		})),
		...reports.rows.map((row) => ({
			record_type: "report" as const,
			record_id: row.record_id,
			system_id: row.system_id,
			starts_at: row.starts_at ?? "",
			ends_at: row.starts_at ?? "",
		})),
	];

	const systemIds = [...new Set(records.map((record) => record.system_id))];

	const hospitalizations = systemIds.length === 0
		? { rows: [] }
		: await client.queryObject<{
			hospitalization_id: string;
			system_id: string;
			entry_date: string;
			discharge_date: string | null;
		}>(
			`SELECT
				hospitalization_id,
				system_id,
				to_char(entry_date, ${TIMESTAMP_FORMAT}) AS entry_date,
				CASE
					WHEN discharge_date IS NULL THEN NULL
					ELSE to_char(discharge_date, ${TIMESTAMP_FORMAT})
				END AS discharge_date
			FROM hospitalizations
			WHERE system_id = ANY($1)
			ORDER BY system_id, entry_date, hospitalization_id`,
			[systemIds],
		);

	return { records, hospitalizations: hospitalizations.rows };
}
