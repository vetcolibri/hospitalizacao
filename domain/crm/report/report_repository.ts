import { Report } from "domain/crm/report/report.ts";
import { ID } from "shared/id.ts";

export interface ReportRepository {
	findByPatientId(patientId: ID): Promise<Report>;
	/**
	 * Relatórios de UM episódio, filtrados directamente por `hospitalization_id`.
	 * O legado sem associação (NULL) fica de fora: a classificação é manual.
	 */
	findAllByHospitalizationId(hospitalizationId: ID): Promise<Report[]>;
	save(report: Report): Promise<void>;
}
