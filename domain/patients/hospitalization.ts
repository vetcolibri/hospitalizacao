import { Either, left, right } from "../../shared/either.ts";
import { ERROR_MESSAGES } from "../../shared/error_messages.ts";
import { InvalidDate } from "./date_error.ts";
import { InvalidNumber } from "./number_error.ts";
import { Budget } from "./budget.ts";
import { BudgetData, HospitalizationData } from "../../shared/types.ts";

export enum Status {
	OPEN = "ABERTA",
	CLOSE = "FECHADA",
}

export class Hospitalization {
	readonly weight: number;
	readonly complaints: string[];
	readonly diagnostics: string[];
	readonly entryDate: Date;
	readonly dischargeDate: Date;
	budgets: Budget[] = [];
	status: Status = Status.OPEN;

	private constructor(
		weight: number,
		complaints: string[],
		diagnostics: string[],
		entryDate: Date,
		dischargeDate: Date,
	) {
		this.weight = weight;
		this.complaints = complaints;
		this.diagnostics = diagnostics;
		this.entryDate = entryDate;
		this.dischargeDate = dischargeDate;
	}

	static create(hospitalizationData: HospitalizationData): Either<Error, Hospitalization> {
		const {
			entryDate,
			dischargeDate,
			complaints,
			diagnostics,
			weight,
			budgetData,
		} = hospitalizationData;

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

		const hospitalization = new Hospitalization(
			weight,
			complaints,
			diagnostics,
			new Date(entryDate),
			new Date(dischargeDate),
		);

		hospitalization.addBudget(budgetData);

		return right(hospitalization);
	}

	addBudget(budgetData: BudgetData) {
		const budget = new Budget(budgetData.startOn, budgetData.endOn, budgetData.status);

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
		this.status = Status.CLOSE;
	}

	static isInvalidDate(date: string): boolean {
		const today = new Date().toDateString();
		return new Date(`${date}T00:00:00.000Z`).getTime() < new Date(today).getTime();
	}

	static isInvalidNumber(set: string[], limit: number): boolean {
		return set.length > limit;
	}
}
