import { Client } from "deps";
import {
	HospitalizationLinkDiagnostic,
	HospitalizationLinkStatus,
} from "domain/hospitalization/hospitalization_link_diagnostic.ts";

interface LinkStatusModel {
	reports: number;
	rounds: number;
}

/**
 * RF-15 — conta o legado por classificar (hospitalization_id a NULL). É uma
 * leitura de diagnóstico: não associa nada nem altera registos.
 */
export class PostgresHospitalizationLinkDiagnostic implements HospitalizationLinkDiagnostic {
	constructor(private client: Client) {}

	async status(): Promise<HospitalizationLinkStatus> {
		const result = await this.client.queryObject<LinkStatusModel>(
			`SELECT
				(SELECT count(*)::int FROM reports WHERE hospitalization_id IS NULL) AS reports,
				(SELECT count(*)::int FROM rounds WHERE hospitalization_id IS NULL) AS rounds`,
		);

		const row = result.rows[0];

		return {
			reportsWithoutHospitalization: Number(row.reports),
			roundsWithoutHospitalization: Number(row.rounds),
		};
	}
}
