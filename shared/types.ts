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
	readonly budgetData: BudgetData;
};

export type PatientData = {
	readonly patientId: string;
	readonly name: string;
	readonly specie: string;
	readonly breed: string;
	readonly birthDate: string;
};

export type OwnerData = {
	readonly ownerId: string;
	readonly name: string;
	readonly phoneNumber: string;
};
