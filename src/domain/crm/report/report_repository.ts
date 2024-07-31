import { Report } from "domain/crm/report/report.ts";
import { ID } from "shared/id.ts";

export interface ReportRepository {
	get(patientId: ID): Promise<Report>;
	save(report: Report): Promise<void>;
}
