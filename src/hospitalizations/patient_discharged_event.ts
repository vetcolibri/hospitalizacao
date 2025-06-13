import { StateAtDischargeEnum } from "./state_at_discharge_enum.ts";

export const PATIENT_DISCHARGED_EVENT_NAME = "PatientDischargedEvent";

export interface PatientDischargedPayload {
	dischargeDate: string; // YYYY-MM-DD format from DateValue
	stateAtDischarge: StateAtDischargeEnum;
	totalReports: number;
}
