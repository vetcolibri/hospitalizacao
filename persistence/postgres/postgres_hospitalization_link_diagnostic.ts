import { Client } from "deps";
import {
	HospitalizationLinkDiagnostic,
	HospitalizationLinkStatus,
} from "domain/hospitalization/hospitalization_link_diagnostic.ts";
import { ID } from "shared/id.ts";

interface LinkStatusModel {
	reports: number;
	rounds: number;
}

/**
 * RF-15 — conta o legado por classificar (hospitalization_id a NULL) DO paciente
 * pedido. É uma leitura de diagnóstico: não associa nada nem altera registos, e
 * usa o `system_id` do path para que pendências de um paciente não apareçam
 * noutro.
 */
export class PostgresHospitalizationLinkDiagnostic implements HospitalizationLinkDiagnostic {
	constructor(private client: Client) {}

	async statusForPatient(patientId: ID): Promise<HospitalizationLinkStatus> {
		const result = await this.client.queryObject<LinkStatusModel>(
			`SELECT
				(SELECT count(*)::int FROM reports WHERE system_id = $SYSTEM_ID AND hospitalization_id IS NULL) AS reports,
				(SELECT count(*)::int FROM rounds WHERE system_id = $SYSTEM_ID AND hospitalization_id IS NULL) AS rounds`,
			{ system_id: patientId.value },
		);

		const row = result.rows[0];

		return {
			reportsWithoutHospitalization: Number(row.reports),
			roundsWithoutHospitalization: Number(row.rounds),
		};
	}
}
