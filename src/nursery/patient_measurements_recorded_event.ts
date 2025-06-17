import { MeasurementTypeEnum } from "./measurement_type_enum.ts";

export const PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME = "PatientMeasurementsRecordedEvent";

export interface PatientMeasurementsRecordedPayload {
	flowSheetRecordId: string;
	hospitalizationId: string;
	recordingType: "MEDICAL_ROUND" | "CONTINUOUS_MEASUREMENT";
	roundType?: string;
	measurements: {
		dateTime: string;
		measurementId: string;
		value: string;
		notes?: string;
	}[];
	totalMeasurementsInRecord: number;
}
