import { Patient } from "../domain/patients/patient.ts";

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

export type AlertData = {
	readonly parameters: string[];
	readonly rate: number;
	readonly comments: string;
	readonly time: string;
};

export interface PatientComposeData extends PatientData {
	status: string;
}

export interface AlertComposeData extends AlertData {
	alertId: string;
	status: string;
	patient: Patient;
}