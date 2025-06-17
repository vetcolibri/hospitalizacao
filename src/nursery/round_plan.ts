import { MeasurementTypeEnum } from "./measurement_type_enum.ts";

/**
 * Defines standard measurement sets for different types of medical rounds
 */
export class RoundPlan {
	/**
	 * Standard vital signs round - basic measurements taken during routine checks
	 */
	static readonly STANDARD_VITALS = [
		MeasurementTypeEnum.HEART_RATE,
		MeasurementTypeEnum.RESPIRATORY_RATE,
		MeasurementTypeEnum.TEMPERATURE,
		MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR,
		MeasurementTypeEnum.CAPILLARY_REFILL_TIME,
	] as const;

	/**
	 * Comprehensive round - extended measurements for critical patients
	 */
	static readonly COMPREHENSIVE = [
		MeasurementTypeEnum.HEART_RATE,
		MeasurementTypeEnum.RESPIRATORY_RATE,
		MeasurementTypeEnum.SYSTOLIC_BP,
		MeasurementTypeEnum.DIASTOLIC_BP,
		MeasurementTypeEnum.TEMPERATURE,
		MeasurementTypeEnum.OXYGEN_SATURATION,
		MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR,
		MeasurementTypeEnum.CAPILLARY_REFILL_TIME,
		MeasurementTypeEnum.PAIN_SCORE,
		MeasurementTypeEnum.WEIGHT,
	] as const;

	/**
	 * Neurological round - focused on neurological assessments
	 */
	static readonly NEUROLOGICAL = [
		MeasurementTypeEnum.HEART_RATE,
		MeasurementTypeEnum.RESPIRATORY_RATE,
		MeasurementTypeEnum.TEMPERATURE,
		MeasurementTypeEnum.GLASGOW_COMA_SCALE,
		MeasurementTypeEnum.PUPIL_SIZE_LEFT,
		MeasurementTypeEnum.PUPIL_SIZE_RIGHT,
	] as const;

	/**
	 * Post-operative round - measurements for post-surgical patients
	 */
	static readonly POST_OPERATIVE = [
		MeasurementTypeEnum.HEART_RATE,
		MeasurementTypeEnum.RESPIRATORY_RATE,
		MeasurementTypeEnum.TEMPERATURE,
		MeasurementTypeEnum.SYSTOLIC_BP,
		MeasurementTypeEnum.DIASTOLIC_BP,
		MeasurementTypeEnum.PAIN_SCORE,
		MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR,
		MeasurementTypeEnum.CAPILLARY_REFILL_TIME,
	] as const;

	/**
	 * ICU round - intensive care measurements
	 */
	static readonly ICU = [
		MeasurementTypeEnum.HEART_RATE,
		MeasurementTypeEnum.RESPIRATORY_RATE,
		MeasurementTypeEnum.SYSTOLIC_BP,
		MeasurementTypeEnum.DIASTOLIC_BP,
		MeasurementTypeEnum.TEMPERATURE,
		MeasurementTypeEnum.OXYGEN_SATURATION,
		MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR,
		MeasurementTypeEnum.CAPILLARY_REFILL_TIME,
		MeasurementTypeEnum.FLUID_INTAKE,
		MeasurementTypeEnum.URINE_OUTPUT,
		MeasurementTypeEnum.GLUCOSE,
		MeasurementTypeEnum.LACTATE,
	] as const;

	/**
	 * Get measurements for a specific round type
	 */
	static getMeasurementsForRound(roundType: string): readonly MeasurementTypeEnum[] {
		switch (roundType.toUpperCase()) {
			case "STANDARD_VITALS":
				return this.STANDARD_VITALS;
			case "COMPREHENSIVE":
				return this.COMPREHENSIVE;
			case "NEUROLOGICAL":
				return this.NEUROLOGICAL;
			case "POST_OPERATIVE":
				return this.POST_OPERATIVE;
			case "ICU":
				return this.ICU;
			default:
				return this.STANDARD_VITALS;
		}
	}

	/**
	 * Get all available round types
	 */
	static getAvailableRoundTypes(): string[] {
		return [
			"STANDARD_VITALS",
			"COMPREHENSIVE",
			"NEUROLOGICAL",
			"POST_OPERATIVE",
			"ICU",
		];
	}
}
