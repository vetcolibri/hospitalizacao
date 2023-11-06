import { HospitalizationBuilder } from "./hospitalization_builder.ts";
import { Either, left, right } from "../../shared/either.ts";
import { ERROR_MESSAGES } from "../../shared/error_messages.ts";
import { InvalidDate } from "./date_error.ts";
import { InvalidNumber } from "./number_error.ts";
import { BirthDate } from "./birth_date.ts";

export enum HospitalizationStatus {
	ACTIVE = "ATIVA",
	UP = "ALTA",
}

export class Hospitalization {
	readonly entryDate: Date;
	readonly dischargeDate: Date;
	readonly estimatedBudgetDate: Date;
	readonly weight: number;
	readonly birthDate: BirthDate;
	readonly complaints: string[];
	readonly diagnostics: string[];
	status: HospitalizationStatus;

	private constructor(builder: HospitalizationBuilder) {
		this.entryDate = new Date(builder.entryDate);
		this.dischargeDate = new Date(builder.dischargeDate);
		this.estimatedBudgetDate = new Date(builder.estimatedBudgetDate);
		this.weight = builder.weight;
		this.birthDate = new BirthDate(builder.birthDate);
		this.complaints = builder.complaints;
		this.diagnostics = builder.diagnostics;
		this.status = HospitalizationStatus.ACTIVE;
	}

	static create(builder: HospitalizationBuilder): Either<Error, Hospitalization> {
		const date = new Date();
		const today = new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);

		if (new Date(builder.entryDate).getDate() < today.getDate()) {
			return left(new InvalidDate(ERROR_MESSAGES.INVALID_ENTRY_DATE));
		}

		if (new Date(builder.dischargeDate).getDate() < today.getDate()) {
			return left(new InvalidDate(ERROR_MESSAGES.INVALID_DISCHARGE_DATE));
		}

		if (builder.complaints.length > 10) {
			return left(new InvalidNumber(ERROR_MESSAGES.INVALID_COMPLAINTS_NUMBER));
		}

		if (builder.diagnostics.length > 5) {
			return left(new InvalidNumber(ERROR_MESSAGES.INVALID_DIAGNOSTICS_NUMBER));
		}

		return right(new Hospitalization(builder));
	}

	getComplaints(): string[] {
		return this.complaints;
	}

	getDiagnostics(): string[] {
		return this.diagnostics;
	}

	down() {
		this.status = HospitalizationStatus.UP;
	}
}
