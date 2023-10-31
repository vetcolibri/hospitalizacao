export type HospitalizationData = {
	readonly age: number;
	readonly weight: number;
	readonly complaints: string;
	readonly diagnostics: string;
	readonly entryDate: string;
	readonly dischargeDate: string;
	readonly estimatedBudgetDate: string;
};

export type NewPatientData = {
	readonly patientData: PatientData;
	readonly hospitalizationData: HospitalizationData;
};

export type PatientData = {
	readonly name: string;
	readonly specie: string;
	readonly breed: string;
	readonly ownerId: string;
	readonly ownerName: string;
	readonly phoneNumber: string;
};

export type MeasurementData = {
	value: unknown;
};

export type ParametersData = {
	[key: string]: MeasurementData;
};
