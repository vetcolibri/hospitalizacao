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

    findAllByHospitalizationId(hospitalizationId: ID): Promise<Report[]> {
        return this.#findAllByHospitalizationId(hospitalizationId);
    }

    async #findAllByHospitalizationId(hospitalizationId: ID): Promise<Report[]> {
        const reports = await this.client.queryObject<ReportModel>(
            `SELECT * FROM reports
             WHERE hospitalization_id = $HOSPITALIZATION_ID
             ORDER BY created_at DESC, report_id DESC`,
            { hospitalization_id: hospitalizationId.value },
        );

        if (reports.rows.length === 0) return [];

        // Uma única query para as descargas de TODOS os relatórios do episódio:
        // o número de queries não cresce com o número de relatórios (sem N+1).
        const reportIds = reports.rows.map((row) => row.report_id);
        const discharges = await this.client.queryObject<DischargeModel>(
            "SELECT * FROM discharges WHERE report_id = ANY($REPORT_IDS)",
            { report_ids: reportIds },
        );

        const dischargesByReport = new Map<string, DischargeModel[]>();

        for (const discharge of discharges.rows) {
            const list = dischargesByReport.get(discharge.report_id) ?? [];
            list.push(discharge);
            dischargesByReport.set(discharge.report_id, list);
        }

        return reports.rows.map((row) =>
            reportFactory(row, dischargesByReport.get(row.report_id) ?? [])
        );
    }

    async save(report: Report): Promise<void> {
        await this.client.queryObject(
            `
            INSERT INTO reports (
                report_id,
                system_id,
                hospitalization_id,
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
                $8,
                $9
            )
        `,
            [
                report.reportId.value,
                report.patientId.value,
                report.hospitalizationId.value,
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
    system_id: string;
    hospitalization_id: string;
    state_of_consciousness: unknown;
    food_types: unknown;
    food_level: string;
    food_date: string;
    created_at: string;
    comments: string;
}

interface DischargeModel {
    report_id: string;
    type: string;
    aspects: unknown;
}

function dischargeFactory(row: DischargeModel): Discharge {
    return new Discharge(row.type, toStringList(row.aspects));
}

function toStringList(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String);

    if (typeof raw !== "string") return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
        return String(parsed).split(",");
    } catch {
        return raw.split(",");
    }
}

function reportFactory(reportModel: ReportModel, dischargeModel: DischargeModel[]): Report {
    const discharges = dischargeModel.map(dischargeFactory);
    const food = new Food(
        toStringList(reportModel.food_types),
        reportModel.food_level,
        reportModel.food_date,
    );

    const report = new Report(
        ID.fromString(reportModel.report_id),
        ID.fromString(reportModel.system_id),
        ID.fromString(reportModel.hospitalization_id),
        toStringList(reportModel.state_of_consciousness),
        food,
        discharges,
        reportModel.comments,
        new Date(reportModel.created_at),
    );
    return report;
}
