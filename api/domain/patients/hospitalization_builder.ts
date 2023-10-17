import { Hospitalization } from "./hospitalization.ts";

export class HospitalizadBuilder {
	entryDate!: Date;
	dischargeDate!: Date;
	estimatedBudgetDate!: Date;
	weight!: number;
	age!: number;
	complaints!: string;
	diagnostics!: string;

	constructor() {}

	setEntryDate(entryDate: string): HospitalizadBuilder {
		this.entryDate = new Date(entryDate);
		return this;
	}

	setDischargeDate(dischargeDate: string): HospitalizadBuilder {
		this.dischargeDate = new Date(dischargeDate);
		return this;
	}

	setEstimatedBudgetDate(estimatedBudgetDate: string): HospitalizadBuilder {
		this.estimatedBudgetDate = new Date(estimatedBudgetDate);
		return this;
	}

	setAge(age: number): HospitalizadBuilder {
		this.age = age;
		return this;
	}

	setWeight(weight: number): HospitalizadBuilder {
		this.weight = weight;
		return this;
	}

	setComplaints(complaints: string): HospitalizadBuilder {
		this.complaints = complaints;
		return this;
	}

	setDiagnostics(diagnostics: string): HospitalizadBuilder {
		this.diagnostics = diagnostics;
		return this;
	}

	build(): Hospitalization {
		return new Hospitalization(this);
	}
}
