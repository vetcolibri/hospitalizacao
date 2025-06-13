export const PATIENT_DISCHARGED_EVENT_NAME = "PatientDischargedEvent";

export interface PatientDischargedPayload {
	dischargeDate: string; // YYYY-MM-DD format from DateValue
	stateAtDischarge: string;
	totalReports: number;
}
