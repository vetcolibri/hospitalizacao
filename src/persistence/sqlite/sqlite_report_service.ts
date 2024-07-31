import { ReportDTO, ReportService } from "domain/crm/report/report_service.ts";
import { DB, RowObject } from "deps";

function toReportDTO(row: RowObject): ReportDTO {
    return {
        reportId: String(row.report_id),
        stateOfConsciousness: JSON.parse(String(row.state_of_consciousness)).split(","),
        food: {
            types: JSON.parse(String(row.food_types)).split(","),
            level: String(row.food_level),
            datetime: String(row.food_date),
        },
        discharge: {
            types: JSON.parse(String(row.discharge_types)).split(","),
            aspects: JSON.parse(String(row.discharge_aspects)).split(","),
        },
        comments: String(row.comments),
        ownerName: String(row.owner_name),
        patientName: String(row.name),
        patientId: String(row.patient_id),
        createdAt: String(row.created_at),
        budgetStatus: String(row.b_status),
    };
}

export class SQLiteReportService implements ReportService {
    #db: DB;

    constructor(db: DB) {
        this.#db = db;
    }

    getAll(patientId: string, hospitalizationId: string): Promise<ReportDTO[]> {
        const rows = this.#db.queryEntries(
            "SELECT b.status as b_status, patients.name, patients.patient_id, owners.owner_name, hospitalizations.system_id, reports.report_id, reports.state_of_consciousness, reports.food_types, reports.food_level, reports.food_date, reports.discharge_types, reports.discharge_aspects, reports.created_at, reports.comments FROM budgets b INNER JOIN hospitalizations ON b.hospitalization_id = :hospitalizationId INNER JOIN reports ON hospitalizations.system_id = reports.system_id INNER JOIN patients ON reports.system_id = patients.system_id INNER JOIN owners ON patients.owner_id = owners.owner_id WHERE reports.system_id = :patientId",
            { patientId, hospitalizationId },
        );

        return Promise.resolve(rows.map(toReportDTO).reverse());
    }
}
