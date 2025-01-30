import { ReportDTO, ReportService } from "domain/crm/report/report_service.ts";

export class InmemReportService implements ReportService {
    findAll(_patientId: string, _hospitalizationId: string): Promise<ReportDTO[]> {
        return Promise.resolve([]);
    }
}
