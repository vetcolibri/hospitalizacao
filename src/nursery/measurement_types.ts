import { MeasurementType } from "./measurement_type.ts";

export const MEASUREMENT_TYPES: Record<string, MeasurementType> = {
	HeartRate: MeasurementType.create(),
};

export enum MeasurementTypeEnum {
	// Vital Signs
	HEART_RATE = "HR",
	RESPIRATORY_RATE = "RR",
	SYSTOLIC_BP = "SBP",
	DIASTOLIC_BP = "DBP",
	TEMPERATURE = "TEMP",
	OXYGEN_SATURATION = "SpO2",

	// Physical Assessment
	WEIGHT = "WEIGHT",
	BODY_CONDITION_SCORE = "BCS",
	MUCOUS_MEMBRANE_COLOR = "MMC",
	CAPILLARY_REFILL_TIME = "CRT",

	// Fluid Balance
	FLUID_INTAKE = "FLUID_IN",
	URINE_OUTPUT = "URINE_OUT",

	// Pain Assessment
	PAIN_SCORE = "PAIN",

	// Neurological
	GLASGOW_COMA_SCALE = "GCS",
	PUPIL_SIZE_LEFT = "PUPIL_L",
	PUPIL_SIZE_RIGHT = "PUPIL_R",

	// Laboratory Values
	GLUCOSE = "GLUCOSE",
	LACTATE = "LACTATE",
	PCV_HEMATOCRIT = "PCV",
	TOTAL_PROTEIN = "TP",
}
