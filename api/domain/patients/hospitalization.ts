import { HospitalizadBuilder } from "./hospitalization_builder.ts";

export enum HospitalizationStatus {
	ACTIVE = "ATIVA",
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

	constructor(builder: HospitalizadBuilder) {
		this.entryDate = builder.entryDate;
		this.dischargeDate = builder.dischargeDate;
		this.estimatedBudgetDate = builder.estimatedBudgetDate;
		this.weight = builder.weight;
		this.age = builder.age;
		this.complaints = builder.complaints;
		this.diagnostics = builder.diagnostics;
		this.status = HospitalizationStatus.ACTIVE;
	}
}
