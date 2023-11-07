import { Either, left, right } from "../../shared/either.ts";
import { BudgetData } from "../../shared/types.ts";
import { Hospitalization } from "./hospitalization.ts";
import { Budget } from "./budget.ts";

export class HospitalizationBuilder {
	birthDate!: string;
	weight!: number;
	complaints!: string[];
	diagnostics!: string[];
	entryDate!: string;
	dischargeDate!: string;
	budget!: Budget;

	constructor() {}

	setBirthDate(birthDate: string): HospitalizationBuilder {
		this.birthDate = birthDate;
		return this;
	}

	setWeight(weight: number): HospitalizationBuilder {
		this.weight = weight;
		return this;
	}

	setComplaints(complaints: string[]): HospitalizationBuilder {
		this.complaints = complaints;
		return this;
	}

	setDiagnostics(diagnostics: string[]): HospitalizationBuilder {
		this.diagnostics = diagnostics;
		return this;
	}

	setEntryDate(entryDate: string): HospitalizationBuilder {
		this.entryDate = entryDate;
		return this;
	}

	setDischargeDate(dischargeDate: string): HospitalizationBuilder {
		this.dischargeDate = dischargeDate;
		return this;
	}

	setBudget(budget: BudgetData): HospitalizationBuilder {
		this.budget = new Budget(budget.startOn, budget.endOn, budget.status);
		return this;
	}

	build(): Either<Error, Hospitalization> {
		const hospitalizationOrError = Hospitalization.create(this);
		if (hospitalizationOrError.isLeft()) return left(hospitalizationOrError.value);
		return right(hospitalizationOrError.value);
	}
}
