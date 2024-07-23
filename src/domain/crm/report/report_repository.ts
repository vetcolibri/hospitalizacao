import { Report } from "domain/crm/report/report.ts";
import { ReportNotFound } from "domain/crm/report/report_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface ReportRepository {
	get(patientId: ID): Promise<Report>;
	save(report: Report): Promise<void>;
	last(patientId: ID): Promise<Either<ReportNotFound, Report>>;
}
