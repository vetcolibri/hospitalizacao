import { DB } from "deps";
import { Report } from "domain/crm/report/report.ts";
import { ReportNotFound } from "domain/crm/report/report_not_found_error.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { Either, left, right } from "shared/either.ts";
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

        const report = factory.createReport(rows[0]);

        return Promise.resolve(report);
    }

    save(report: Report): Promise<void> {
        this.#db.queryEntries(
            `
			INSERT INTO reports (
				report_id,
				system_id,
				state_of_consciousness,
				food_type,
				food_level,
				food_date,
				discharge_type,
				discharge_aspect,
                created_at,
				comments
			)
			VALUES (
				:reportId,
				:systemId,
				:stateOfConsciousness,
				:foodType,
				:foodLevel,
				:foodDate,
				:dischargeType,
				:dischargeAspect,
                :createdAt,
				:comments
			)
		`,
            {
                reportId: report.reportId.value,
                systemId: report.patientId.value,
                stateOfConsciousness: JSON.stringify(report.stateOfConsciousness.join(",")),
                foodType: JSON.stringify(report.food.types.join(",")),
                foodLevel: report.food.level,
                foodDate: report.food.datetime,
                dischargeType: report.discharge.type,
                dischargeAspect: report.discharge.aspect,
                createdAt: report.createdAt,
                comments: report.comments,
            },
        );

        return Promise.resolve(undefined);
    }

    last(patientId: ID): Promise<Either<ReportNotFound, Report>> {
        const rows = this.#db.queryEntries(
            "SELECT * FROM reports WHERE system_id = :systemId",
            {
                systemId: patientId.value,
            },
        );

        if (rows.length === 0) return Promise.resolve(left(new ReportNotFound()));

        const report = factory.createReport(rows[rows.length - 1]);

        return Promise.resolve(right(report));
    }
}
