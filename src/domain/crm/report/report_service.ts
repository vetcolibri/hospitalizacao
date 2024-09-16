import { ReportData } from "application/crm_service.ts";

export interface ReportDTO extends ReportData {
    reportId: string;
    patientName: string;
    ownerName: string;
    patientId: string;
    createdAt: string;
    budgetStatus: string;
}

export interface ReportService {
    findAll(patientId: string, hospitalizationId: string): Promise<ReportDTO[]>;
}
