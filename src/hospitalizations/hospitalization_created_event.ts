import { ComplaintEnum } from "./complaint_enum.ts";
import { DiagnosisEnum } from "./diagnosis_enum.ts";

export const HOSPITALIZATION_CREATED_EVENT_NAME = "HospitalizationCreatedEvent";

export interface HospitalizationCreatedPayload {
	admissionDate: string;
	estimatedDischargeDate: string;
	initialDiagnosis: DiagnosisEnum[];
	complaints: ComplaintEnum[];
	petId: string;
	petName: string;
	petAge: string;
	petWeight: number;
	ownerId: string;
	ownerName: string;
	contactPersonName: string;
	contactPersonWhatsApp: string;
}
