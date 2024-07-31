import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { Report } from "domain/crm/report/report.ts";
import { ID } from "shared/id.ts";

export class InmemReportRepository implements ReportRepository {
    #reports: Record<string, Report> = {};

    get(patientId: ID): Promise<Report> {
        return Promise.resolve(this.#reports[patientId.toString()]);
    }

    save(report: Report): Promise<void> {
        this.#reports[report.patientId.toString()] = report;
        return Promise.resolve(undefined);
    }
}
