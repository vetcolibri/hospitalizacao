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
                system_id: patientId.value,
            },
        );

        const discharges = await this.client.queryObject<DischargeModel>(
            `SELECT * FROM discharges WHERE report_id = $REPORT_ID`,
            {
                report_id: String(reports.rows[0].report_id),
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
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8
            )
        `,
            [
                report.reportId.value,
                report.patientId.value,
                JSON.stringify(report.stateOfConsciousness.join(",")),
                JSON.stringify(report.food.types.join(",")),
                report.food.level,
                report.food.datetime,
                report.createdAt,
                report.comments,
            ],
        );
            
        for (const discharge of report.discharges) {
            await this.client.queryObject("INSERT INTO discharges (report_id, type, aspects) VALUES ($1, $2, $3)", [
                report.reportId.value,
                discharge.type,
                JSON.stringify(discharge.aspects),
            ])
        }
        
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

function reportFactory(reportModel: ReportModel, dischargeModel: DischargeModel[]): Report {
    const discharges = dischargeModel.map(dischargeFactory);
    const food = new Food(
        reportModel.food_types.split(","),
        reportModel.food_level,
        reportModel.food_date,
    );

    const report = new Report(
        ID.fromString(reportModel.report_id),
        ID.fromString(reportModel.patient_id),
        reportModel.state_of_consciousness.split(","),
        food,
        discharges,
        reportModel.comments,
        new Date(reportModel.created_at),
    );
    return report;
}
