import { Either, left, right } from "../../shared/either.ts";
import { Hospitalization } from "./hospitalization.ts";

export class HospitalizationBuilder {
	entryDate!: string;
	dischargeDate!: string;
	estimatedBudgetDate!: string;
	weight!: number;
	birthDate!: string;
	complaints!: string[];
	diagnostics!: string[];

	constructor() {}

	setEntryDate(entryDate: string): HospitalizationBuilder {
		this.entryDate = entryDate;
		return this;
	}

	setDischargeDate(dischargeDate: string): HospitalizationBuilder {
		this.dischargeDate = dischargeDate;
		return this;
	}

	setEstimatedBudgetDate(estimatedBudgetDate: string): HospitalizationBuilder {
		this.estimatedBudgetDate = estimatedBudgetDate;
		return this;
	}

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

	build(): Either<Error, Hospitalization> {
		const hospitalizationOrError = Hospitalization.create(this);
		if (hospitalizationOrError.isLeft()) return left(hospitalizationOrError.value);
		return right(hospitalizationOrError.value);
	}
}
