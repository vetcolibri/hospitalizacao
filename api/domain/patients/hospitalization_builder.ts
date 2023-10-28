import { Either, left, right } from "../../shared/either.ts";
import { Hospitalization } from "./hospitalization.ts";

export class HospitalizationBuilder {
	entryDate!: Date;
	dischargeDate!: Date;
	estimatedBudgetDate!: Date;
	weight!: number;
	age!: number;
	complaints!: string;
	diagnostics!: string;

	constructor() {}

	setEntryDate(entryDate: string): HospitalizationBuilder {
		this.entryDate = new Date(entryDate);
		return this;
	}

	setDischargeDate(dischargeDate: string): HospitalizationBuilder {
		this.dischargeDate = new Date(dischargeDate);
		return this;
	}

	setEstimatedBudgetDate(estimatedBudgetDate: string): HospitalizationBuilder {
		this.estimatedBudgetDate = new Date(estimatedBudgetDate);
		return this;
	}

	setAge(age: number): HospitalizationBuilder {
		this.age = age;
		return this;
	}

	setWeight(weight: number): HospitalizationBuilder {
		this.weight = weight;
		return this;
	}

	setComplaints(complaints: string): HospitalizationBuilder {
		this.complaints = complaints;
		return this;
	}

	setDiagnostics(diagnostics: string): HospitalizationBuilder {
		this.diagnostics = diagnostics;
		return this;
	}

	build(): Either<Error, Hospitalization> {
		const hospitalizationOrError = Hospitalization.create(this);
		if (hospitalizationOrError.isLeft()) return left(hospitalizationOrError.value);
		return right(hospitalizationOrError.value);
	}
}
