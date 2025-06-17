import { FeedingTypeEnum } from "./feeding_type_enum.ts";
import { FeedingCategoryEnum } from "./feeding_category_enum.ts";

export const PATIENT_INTAKE_RECORDED_EVENT_NAME = "PatientIntakeRecordedEvent";

export interface PatientIntakeRecordedPayload {
	intakeOutputId: string;
	hospitalizationId: string;
	dateTime: string;
	type: FeedingTypeEnum;
	notes: string;
	feedingCategory?: FeedingCategoryEnum;
	appetiteScore?: number;
}
