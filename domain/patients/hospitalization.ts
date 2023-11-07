import { HospitalizationBuilder } from "./hospitalization_builder.ts";
import { Either, left, right } from "../../shared/either.ts";
import { ERROR_MESSAGES } from "../../shared/error_messages.ts";
import { InvalidDate } from "./date_error.ts";
import { InvalidNumber } from "./number_error.ts";
import { BirthDate } from "./birth_date.ts";
import { Budget } from "./budget.ts";

export enum HospitalizationStatus {
	ACTIVE = "ATIVA",
	UP = "ALTA",
}

export class Hospitalization {
	readonly birthDate: BirthDate;
	readonly weight: number;
	readonly complaints: string[];
	readonly diagnostics: string[];
	readonly entryDate: Date;
	readonly dischargeDate: Date;
	budget: Budget;
	status: HospitalizationStatus;

	private constructor(builder: HospitalizationBuilder) {
		this.birthDate = new BirthDate(builder.birthDate);
		this.weight = builder.weight;
		this.complaints = builder.complaints;
		this.diagnostics = builder.diagnostics;
		this.entryDate = new Date(builder.entryDate);
		this.dischargeDate = new Date(builder.dischargeDate);
		this.status = HospitalizationStatus.ACTIVE;
		this.budget = builder.budget;
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

	getBudget(): Budget {
		return this.budget;
	}

	down() {
		this.status = HospitalizationStatus.UP;
	}
}
