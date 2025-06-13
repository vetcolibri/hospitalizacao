import { DiagnosisEnum } from "./diagnosis_enum.ts";

export const HOSPITALIZATION_UPDATED_EVENT_NAME = "HospitalizationUpdatedEvent";

export interface HospitalizationUpdatedPayload {
	estimatedDischargeDate?: string;
	actualDiagnosis?: DiagnosisEnum[];
	contactPersonChanged?: boolean;
}
