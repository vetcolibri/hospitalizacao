import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { Report } from "domain/crm/report/report.ts";
import { ID } from "shared/id.ts";

export class InmemReportRepository implements ReportRepository {
    readonly #reports: Report[] = [];

    constructor(reports: Report[] = []) {
        this.#reports.push(...reports);
    }

    findByPatientId(patientId: ID): Promise<Report> {
        return Promise.resolve(
            this.#reports.findLast((report) => report.patientId.equals(patientId))!,
        );
    }

    findAllByHospitalizationId(hospitalizationId: ID): Promise<Report[]> {
        return Promise.resolve(
            this.#reports.filter((report) => report.hospitalizationId.equals(hospitalizationId)),
        );
    }

    save(report: Report): Promise<void> {
        this.#reports.push(report);
        return Promise.resolve(undefined);
    }
}
