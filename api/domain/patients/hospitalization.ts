import { HospitalizationBuilder } from "./hospitalization_builder.ts";
import { Either, left, right } from "../../shared/either.ts";
import { ERROR_MESSAGES } from "../../shared/error_messages.ts";
import { DateInvalid } from "./date_invalid_error.ts";

export enum HospitalizationStatus {
	ACTIVE = "ATIVA",
	UP = "ALTA",
}

export class Hospitalization {
	readonly entryDate: Date;
	readonly dischargeDate: Date;
	readonly estimatedBudgetDate: Date;
	readonly weight: number;
	readonly age: number;
	readonly complaints: string;
	readonly diagnostics: string;
	status: HospitalizationStatus;

	private constructor(builder: HospitalizationBuilder) {
		this.entryDate = builder.entryDate;
		this.dischargeDate = builder.dischargeDate;
		this.estimatedBudgetDate = builder.estimatedBudgetDate;
		this.weight = builder.weight;
		this.age = builder.age;
		this.complaints = builder.complaints;
		this.diagnostics = builder.diagnostics;
		this.status = HospitalizationStatus.ACTIVE;
	}

	static create(builder: HospitalizationBuilder): Either<Error, Hospitalization> {
		const date = new Date();
		const today = new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);

		if (new Date(builder.entryDate).getDate() < today.getDate()) {
			return left(new DateInvalid(ERROR_MESSAGES.ENTRY_DATE_INVALID));
		}

		if (new Date(builder.dischargeDate).getDate() < today.getDate()) {
			return left(new DateInvalid(ERROR_MESSAGES.DISCHARGE_DATE_INVALID));
		}

		if (new Date(builder.estimatedBudgetDate).getDate() < today.getDate()) {
			return left(new DateInvalid(ERROR_MESSAGES.ESTIMATED_BUDGET_DATE_INVALID));
		}

		return right(new Hospitalization(builder));
	}

	down() {
		this.status = HospitalizationStatus.UP;
	}
}
