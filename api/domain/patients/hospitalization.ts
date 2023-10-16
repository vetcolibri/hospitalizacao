export enum HospitalizationStatus {
	ACTIVE = "ATIVA",
}

export class Hospitalization {
	readonly entryDate: Date;
	readonly dischargeDate: Date;
	readonly estimatedBudgetDate: Date;
	status: HospitalizationStatus;

	constructor(entryDate: string, dischargeDate: string, estimatedBudgetDate: string) {
		this.entryDate = new Date(entryDate);
		this.dischargeDate = new Date(dischargeDate);
		this.estimatedBudgetDate = new Date(estimatedBudgetDate);
		this.status = HospitalizationStatus.ACTIVE;
	}
}
