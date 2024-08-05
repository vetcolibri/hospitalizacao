import { DB, RowObject } from "deps";
import { ReportDTO, ReportService } from "domain/crm/report/report_service.ts";

function toReportDTO(row: RowObject): ReportDTO {
    const result = {
        reportId: String(row.report_id),
        stateOfConsciousness: JSON.parse(String(row.state_of_consciousness)).split(","),
        food: {
            types: JSON.parse(String(row.food_types)).split(","),
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

    return result;
}

function toDischarge(row: RowObject) {
    return {
        type: String(row.type),
        aspects: JSON.parse(String(row.aspects)).split(","),
    };
}

export class SQLiteReportService implements ReportService {
    #db: DB;

    constructor(db: DB) {
        this.#db = db;
    }

    getAll(patientId: string, hospitalizationId: string): Promise<ReportDTO[]> {
        const rows = this.#db.queryEntries(
            "SELECT b.status as b_status, patients.name, patients.patient_id, owners.owner_name, hospitalizations.system_id, reports.report_id, reports.state_of_consciousness, reports.food_types, reports.food_level, reports.food_date, reports.created_at, reports.comments FROM budgets b INNER JOIN hospitalizations ON b.hospitalization_id = :hospitalizationId INNER JOIN reports ON hospitalizations.system_id = reports.system_id INNER JOIN patients ON reports.system_id = patients.system_id INNER JOIN owners ON patients.owner_id = owners.owner_id WHERE reports.system_id = :patientId",
            { patientId, hospitalizationId },
        );

        const reports = rows.map(toReportDTO);

        for (const report of reports) {
            const r = this.#db.queryEntries(
                "SELECT * FROM discharges WHERE discharges.report_id = :reportId",
                { reportId: report.reportId },
            );

            report.discharges = [...r.map(toDischarge)];
        }

        return Promise.resolve(reports.reverse());
    }
}
