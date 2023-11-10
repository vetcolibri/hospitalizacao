import { HospitalizationBuilder } from "./hospitalization_builder.ts";
import { Either, left, right } from "../../shared/either.ts";
import { ERROR_MESSAGES } from "../../shared/error_messages.ts";
import { InvalidDate } from "./date_error.ts";
import { InvalidNumber } from "./number_error.ts";
import { BirthDate } from "./birth_date.ts";
import { Budget } from "./budget.ts";

export enum HospitalizationStatus {
	ACTIVE = "ATIVA",
	DISABLE = "INATIVA",
}

export class Hospitalization {
	readonly birthDate: BirthDate;
	readonly weight: number;
	readonly complaints: string[];
	readonly diagnostics: string[];
	readonly entryDate: Date;
	readonly dischargeDate: Date;
	budgets: Budget[] = [];
	status: HospitalizationStatus = HospitalizationStatus.ACTIVE;

	private constructor(builder: HospitalizationBuilder) {
		this.birthDate = new BirthDate(builder.birthDate);
		this.weight = builder.weight;
		this.complaints = builder.complaints;
		this.diagnostics = builder.diagnostics;
		this.entryDate = new Date(builder.entryDate);
		this.dischargeDate = new Date(builder.dischargeDate);
	}

	static create(builder: HospitalizationBuilder): Either<Error, Hospitalization> {
		const { entryDate, dischargeDate, complaints, diagnostics } = builder;
		if (this.isInvalidDate(entryDate)) {
			return left(new InvalidDate(ERROR_MESSAGES.INVALID_ENTRY_DATE));
		}

		if (this.isInvalidDate(dischargeDate)) {
			return left(new InvalidDate(ERROR_MESSAGES.INVALID_DISCHARGE_DATE));
		}

		if (this.isInvalidNumber(complaints, 10)) {
			return left(new InvalidNumber(ERROR_MESSAGES.INVALID_COMPLAINTS_NUMBER));
		}

		if (this.isInvalidNumber(diagnostics, 5)) {
			return left(new InvalidNumber(ERROR_MESSAGES.INVALID_DIAGNOSTICS_NUMBER));
		}

		const hospitalization = new Hospitalization(builder);
		hospitalization.addBudget(builder.budget);
		return right(hospitalization);
	}

	addBudget(budget: Budget) {
		this.budgets.push(budget);
	}

	activeBudget(): Budget {
		return this.budgets.find((budget) => budget.isActive())!;
	}

	getComplaints(): string[] {
		return this.complaints;
	}

	getDiagnostics(): string[] {
		return this.diagnostics;
	}

	disable() {
		this.status = HospitalizationStatus.DISABLE;
	}

	static isInvalidDate(date: string): boolean {
		const today = new Date().toDateString();
		return new Date(`${date}T00:00:00.000Z`).getTime() < new Date(today).getTime();
	}

	static isInvalidNumber(set: string[], limit: number): boolean {
		return set.length > limit;
	}
}
