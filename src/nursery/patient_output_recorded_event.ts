import { EliminationTypeEnum } from "./elimination_type_enum.ts";

export const PATIENT_OUTPUT_RECORDED_EVENT_NAME = "PatientOutputRecordedEvent";

export interface PatientOutputRecordedPayload {
	intakeOutputId: string;
	hospitalizationId: string;
	dateTime: string;
	type: EliminationTypeEnum;
	aspect: string;
}
