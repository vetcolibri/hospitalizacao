export type BudgetData = {
	readonly startOn: string;
	readonly endOn: string;
	readonly status: string;
};

export type HospitalizationData = {
	readonly birthDate: string;
	readonly weight: number;
	readonly complaints: string[];
	readonly diagnostics: string[];
	readonly entryDate: string;
	readonly dischargeDate: string;
	readonly budget: BudgetData;
};
