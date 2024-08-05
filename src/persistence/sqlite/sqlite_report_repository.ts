import { DB } from "deps";
import { Report } from "domain/crm/report/report.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { EntityFactory } from "shared/factory.ts";
import { ID } from "shared/id.ts";

const factory = new EntityFactory();

export class SQLiteReportRepository implements ReportRepository {
    #db: DB;

    constructor(db: DB) {
        this.#db = db;
    }

    get(patientId: ID): Promise<Report> {
        const rows = this.#db.queryEntries(
            `SELECT * FROM reports WHERE system_id = :systemId LIMIT 1`,
            {
                systemId: patientId.value,
            },
        );

        const dischargeData = this.#db.queryEntries(
            `SELECT * FROM discharges WHERE report_id = :reportId`,
            {
                reportId: String(rows[0].report_id),
            },
        );

        const report = factory.createReport(rows[0], dischargeData);

        return Promise.resolve(report);
    }

    save(report: Report): Promise<void> {
        this.#db.queryEntries(
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

        for (const discharge of report.discharges) {
            this.#db.queryEntries(
                `
                INSERT INTO discharges (
                    report_id,
                    type,
                    aspects
                ) 
                VALUES (
                    :reportId,
                    :type,
                    :aspects
                )
            `,
                {
                    reportId: report.reportId.value,
                    type: discharge.type,
                    aspects: JSON.stringify(discharge.aspects.join(",")),
                },
            );
        }

        return Promise.resolve(undefined);
    }
}
