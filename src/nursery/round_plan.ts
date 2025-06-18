import { MEASUREMENT_TYPES } from "./measurement_types.ts";

/**
 * Defines standard measurement sets for different types of medical rounds
 */
export class RoundPlan {
	static readonly STANDARD_CATS = [
		MEASUREMENT_TYPES.HeartRate,
		MEASUREMENT_TYPES.RespiratoryRate,
		MEASUREMENT_TYPES.TRC,
		MEASUREMENT_TYPES.AVDN,
		MEASUREMENT_TYPES.Mucous,
		MEASUREMENT_TYPES.Temperature,
		MEASUREMENT_TYPES.Glycemia,
		MEASUREMENT_TYPES.HTC_Feline,
		MEASUREMENT_TYPES.BloodPressure_Systolic,
		MEASUREMENT_TYPES.BloodPressure_Diastolic,
		MEASUREMENT_TYPES.BloodPressure_PAM,
	];

	static readonly STANDARD_DOGS = [
		MEASUREMENT_TYPES.HeartRate,
		MEASUREMENT_TYPES.RespiratoryRate,
		MEASUREMENT_TYPES.TRC,
		MEASUREMENT_TYPES.AVDN,
		MEASUREMENT_TYPES.Mucous,
		MEASUREMENT_TYPES.Temperature,
		MEASUREMENT_TYPES.Glycemia,
		MEASUREMENT_TYPES.HTC_Canine,
		MEASUREMENT_TYPES.BloodPressure_Systolic,
		MEASUREMENT_TYPES.BloodPressure_Diastolic,
		MEASUREMENT_TYPES.BloodPressure_PAM,
	];
}
