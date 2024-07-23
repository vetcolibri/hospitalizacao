import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { Report } from "domain/crm/report/report.ts";
import { ID } from "shared/id.ts";
import { Either, left, right } from "shared/either.ts";
import { ReportNotFound } from "domain/crm/report/report_not_found_error.ts";

export class InmemReportRepository implements ReportRepository {
    #reports: Record<string, Report> = {};

    get(patientId: ID): Promise<Report> {
        return Promise.resolve(this.#reports[patientId.toString()]);
    }

    save(report: Report): Promise<void> {
        this.#reports[report.patientId.toString()] = report;
        return Promise.resolve(undefined);
    }

    last(patientId: ID): Promise<Either<ReportNotFound, Report>> {
        const report = this.#reports[patientId.toString()];

        if (!report) return Promise.resolve(left(new ReportNotFound()));

        return Promise.resolve(right(report));
    }
}
