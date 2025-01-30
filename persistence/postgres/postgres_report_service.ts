import { Client } from "deps";
import { ReportDTO, ReportService } from "domain/crm/report/report_service.ts";

export class PostgresReportService implements ReportService {
    constructor(private client: Client) {}

    async findAll(patientId: string, hospitalizationId: string): Promise<ReportDTO[]> {
        const result = await this.client.queryObject(
            `SELECT b.status as b_status, patients.name, patients.patient_id, owners.name as owner_name, hospitalizations.system_id, reports.report_id, reports.state_of_consciousness, reports.food_types, reports.food_level, reports.food_date, reports.created_at, reports.comments FROM budgets b INNER JOIN hospitalizations ON b.hospitalization_id = $HOSPITALIZATION_ID INNER JOIN reports ON hospitalizations.system_id = reports.system_id INNER JOIN patients ON reports.system_id = patients.system_id INNER JOIN owners ON patients.owner_id = owners.owner_id WHERE reports.system_id = $PATIENT_ID`,
            { patient_id: patientId, hospitalization_id: hospitalizationId },
        );

        const reports = result.rows.map(toReportDTO);

        for (const report of reports) {
            const r = await this.client.queryObject(
                "SELECT * FROM discharges WHERE discharges.report_id = $REPORT_ID",
                { report_id: report.reportId },
            );

            report.discharges = [...r.rows.map(toDischarge)];
        }

        return reports.reverse();
    }
}

// deno-lint-ignore no-explicit-any
function toReportDTO(row: any): ReportDTO {
    return {
        reportId: String(row.report_id),
        stateOfConsciousness: String(row.state_of_consciousness).split(","),
        food: {
            types: String(row.food_types).split(","),
            level: String(row.food_level),
            datetime: String(row.food_date),
        },
        discharges: [],
        comments: String(row.comments),
        ownerName: String(row.owner_name),
        patientName: String(row.name),
        patientId: String(row.patient_id),
        createdAt: String(row.created_at),
        budgetStatus: String(row.b_status),
    };
}

// deno-lint-ignore no-explicit-any
function toDischarge(row: any) {
    return {
        type: String(row.type),
        aspects: String(row.aspects).split(","),
    };
}
