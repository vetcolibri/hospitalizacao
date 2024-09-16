import { Client } from "deps";
import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { ID } from "shared/id.ts";

export class PostgresReportRepository implements ReportRepository {
    constructor(private client: Client) {}

    async findByPatientId(patientId: ID): Promise<Report> {
        const reports = await this.client.queryObject<ReportModel>(
            "SELECT * FROM reports WHERE system_id = $SYSTEM_ID LIMIT 1",
            {
                systemId: patientId.value,
            },
        );

        const discharges = await this.client.queryObject<DischargeModel>(
            `SELECT * FROM discharges WHERE report_id = $REPORT_ID`,
            {
                reportId: String(reports.rows[0].report_id),
            },
        );

        return reportFactory(reports.rows[0], discharges.rows);
    }

    async save(report: Report): Promise<void> {
        await this.client.queryObject(
            `
			INSERT INTO reports (
				report_id,
				system_id,
				state_of_consciousness,
				food_types,
				food_level,
				food_date,
                created_at,
				comments
			)
			VALUES (
				:reportId,
				:systemId,
				:stateOfConsciousness,
				:foodTypes,
				:foodLevel,
				:foodDate,
                :createdAt,
				:comments
			)
		`,
            {
                reportId: report.reportId.value,
                systemId: report.patientId.value,
                stateOfConsciousness: JSON.stringify(report.stateOfConsciousness.join(",")),
                foodTypes: JSON.stringify(report.food.types.join(",")),
                foodLevel: report.food.level,
                foodDate: report.food.datetime,
                createdAt: report.createdAt,
                comments: report.comments,
            },
        );

        const query = `INSERT INTO discharges (report_id, type, aspects) VALUES $VALUES`;
        const values = report.discharges.map((discharge) =>
            `(${report.reportId.value}, ${discharge.type}, ${
                JSON.stringify(discharge.aspects.join(","))
            })`
        ).join(",");

        await this.client.queryObject(
            query,
            {
                values,
            },
        );

        return undefined;
    }
}

interface ReportModel {
    report_id: string;
    patient_id: string;
    state_of_consciousness: string;
    food_types: string;
    food_level: string;
    food_date: string;
    created_at: string;
    comments: string;
}

interface DischargeModel {
    report_id: string;
    type: string;
    aspects: string;
}

function dischargeFactory(row: DischargeModel): Discharge {
    return new Discharge(row.type, JSON.parse(row.aspects).split(","));
}

function reportFactory(reportRow: ReportModel, dischargeRows: DischargeModel[]): Report {
    const discharges = dischargeRows.map(dischargeFactory);
    const food = new Food(
        JSON.parse(reportRow.food_types).split(","),
        reportRow.food_level,
        reportRow.food_date,
    );

    const report = new Report(
        ID.fromString(reportRow.report_id),
        ID.fromString(reportRow.patient_id),
        JSON.parse(reportRow.state_of_consciousness).split(","),
        food,
        discharges,
        reportRow.comments,
        new Date(reportRow.created_at),
    );
    return report;
}
