import { BudgetData, HospitalizationData } from "shared/types.ts";
import { ERROR_MESSAGES } from "shared/error_messages.ts";
import { Either, left, right } from "shared/either.ts";
import { InvalidNumber } from "./number_error.ts";
import { InvalidDate } from "./date_error.ts";
import { Budget } from "./budget.ts";
import { ID } from "shared/id.ts";

export enum HospitalizationStatus {
	OPEN = "ABERTA",
	CLOSE = "FECHADA",
}

export class Hospitalization {
	hospitalizationId: ID;
	readonly weight: number;
	readonly complaints: string[];
	readonly diagnostics: string[];
	readonly entryDate: Date;
	dischargeDate?: Date;
	budgets: Budget[] = [];
	status: HospitalizationStatus = HospitalizationStatus.OPEN;

	private constructor(
		weight: number,
		complaints: string[],
		diagnostics: string[],
		entryDate: Date,
		dischargeDate?: Date,
	) {
		this.hospitalizationId = ID.random();
		this.weight = weight;
		this.complaints = complaints;
		this.diagnostics = diagnostics;
		this.entryDate = entryDate;
		this.dischargeDate = dischargeDate;
	}

	static create(
		data: HospitalizationData,
	): Either<Error, Hospitalization> {
		if (this.isInvalidDate(data.entryDate)) {
			return left(new InvalidDate(ERROR_MESSAGES.INVALID_ENTRY_DATE));
		}

		if (this.isInvalidDate(data.dischargeDate)) {
			return left(new InvalidDate(ERROR_MESSAGES.INVALID_DISCHARGE_DATE));
		}

		if (this.isInvalidNumber(data.complaints, 10)) {
			return left(new InvalidNumber(ERROR_MESSAGES.INVALID_COMPLAINTS_NUMBER));
		}

		if (this.isInvalidNumber(data.diagnostics, 5)) {
			return left(new InvalidNumber(ERROR_MESSAGES.INVALID_DIAGNOSTICS_NUMBER));
		}

		const hospitalization = new Hospitalization(
			data.weight,
			data.complaints,
			data.diagnostics,
			new Date(data.entryDate),
		);

		if (data.dischargeDate) {
			hospitalization.dischargeDate = new Date(data.dischargeDate);
		}

		hospitalization.addBudget(data.budgetData);

		return right(hospitalization);
	}

	addBudget(data: BudgetData) {
		const budget = new Budget(
			data.startOn,
			data.endOn,
			data.status,
		);
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
		if (!this.isOpen()) return;
		this.status = HospitalizationStatus.CLOSE;
	}

	isOpen(): boolean {
		return this.status === HospitalizationStatus.OPEN;
	}

	static isInvalidDate(date: string): boolean {
		const today = new Date().toDateString();
		return (
			new Date(`${date}T00:00:00.000Z`).getTime() < new Date(today).getTime()
		);
	}

	static isInvalidNumber(set: string[], limit: number): boolean {
		return set.length > limit;
	}
}
