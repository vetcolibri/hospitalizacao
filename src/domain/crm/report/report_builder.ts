import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { Either, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class ReportBuilder {
    #patientId?: ID;
    #food?: Food;
    #discharge?: Discharge;
    #stateOfConsciousness?: string[];
    #comments?: string;

    withPatientId(patientId: ID): ReportBuilder {
        this.#patientId = patientId;
        return this;
    }

    withFood(food: Food): ReportBuilder {
        this.#food = food;
        return this;
    }

    withDischarge(discharge: Discharge): ReportBuilder {
        this.#discharge = discharge;
        return this;
    }

    withStateOfConsciousness(stateOfConsciousness: string[]): ReportBuilder {
        this.#stateOfConsciousness = stateOfConsciousness;
        return this;
    }

    withComments(comments: string): ReportBuilder {
        this.#comments = comments;
        return this;
    }

    build(): Either<Error, Report> {
        if (!this.#patientId) {
            throw new Error("Patient ID is required");
        }

        if (!this.#food) {
            throw new Error("Food is required");
        }

        if (!this.#discharge) {
            throw new Error("Discharge is required");
        }

        if (!this.#stateOfConsciousness) {
            throw new Error("State of consciousness is required");
        }

        if (!this.#comments) {
            throw new Error("Comments is required");
        }

        const report = new Report(
            ID.random(),
            this.#patientId,
            this.#stateOfConsciousness,
            this.#food,
            this.#discharge,
            this.#comments,
        );

        return right(report);
    }
}
