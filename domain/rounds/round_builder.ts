import { Round } from "./round.ts";
import { HeartRate } from "../parameters/heart_rate.ts";
import { Either, left, right } from "../../shared/either.ts";
import { RespiratoryRate } from "../parameters/respiratore_rate.ts";
import { Trc } from "../parameters/trc.ts";
import { Temperature } from "../parameters/temperature.ts";
import { Avdn } from "../parameters/avdn.ts";
import { Mucosas } from "../parameters/mucosas.ts";
import { BloodGlucose } from "../parameters/blood_glucose.ts";
import { Hct } from "../parameters/hct.ts";
import { BloodPressure } from "../parameters/blood_pressure.ts";
import { InvalidParameter } from "../parameters/parameter_error.ts";
import { ERROR_MESSAGES } from "../../shared/error_messages.ts";
import { Patient } from "../patients/patient.ts";
import { MeasurementData } from "../../application/round_service.ts";

export class RoundBuilder {
	private readonly round: Round;

	constructor(patient: Patient) {
		this.round = new Round(patient);
	}

	withHeartRate(data: MeasurementData): RoundBuilder {
		if (data) {
			const heartRate = new HeartRate(Number(data.value));
			this.round.addParameter(heartRate);
		}
		return this;
	}

	withRespiratoryRate(data: MeasurementData): RoundBuilder {
		if (data) {
			const respiratoryRate = new RespiratoryRate(Number(data.value));
			this.round.addParameter(respiratoryRate);
		}
		return this;
	}

	withTrc(data: MeasurementData): RoundBuilder {
		if (data) {
			const trc = new Trc(Number(data.value));
			this.round.addParameter(trc);
		}
		return this;
	}

	withAvdn(data: MeasurementData): RoundBuilder {
		if (data) {
			const avdn = new Avdn(String(data.value));
			this.round.addParameter(avdn);
		}
		return this;
	}

	withMucosas(data: MeasurementData): RoundBuilder {
		if (data) {
			const mucosas = new Mucosas(String(data.value));
			this.round.addParameter(mucosas);
		}
		return this;
	}

	withTemperature(data: MeasurementData): RoundBuilder {
		if (data) {
			const temperature = new Temperature(Number(data.value));
			this.round.addParameter(temperature);
		}
		return this;
	}

	withBloodGlucose(data: MeasurementData): RoundBuilder {
		if (data) {
			const bloodGlucose = new BloodGlucose(Number(data.value));
			this.round.addParameter(bloodGlucose);
		}
		return this;
	}

	withHct(data: MeasurementData): RoundBuilder {
		if (data) {
			const hct = new Hct(Number(data.value));
			this.round.addParameter(hct);
		}
		return this;
	}

	withBloodPressure(data: MeasurementData): RoundBuilder {
		if (data) {
			const bloodPressure = new BloodPressure(String(data.value));
			this.round.addParameter(bloodPressure);
		}
		return this;
	}

	build(): Either<Error, Round> {
		for (const parameter of this.round.parameters) {
			if (!parameter.isValid()) {
				const error = this.findError(parameter.name);
				return left(new InvalidParameter(error));
			}
		}
		return right(this.round);
	}

	private findError(name: string): string {
		switch (name) {
			case "heart_rate":
				return ERROR_MESSAGES.INVALID_HEART_RATE;
			case "respiratory_rate":
				return ERROR_MESSAGES.INVALID_RESPIRATORY_RATE;
			case "trc":
				return ERROR_MESSAGES.INVALID_TRC;
			case "avdn":
				return ERROR_MESSAGES.INVALID_AVDN;
			case "mucosas":
				return ERROR_MESSAGES.INVALID_MUCOSAS;
			case "temperature":
				return ERROR_MESSAGES.INVALID_TEMPERATURE;
			case "blood_glucose":
				return ERROR_MESSAGES.INVALID_BLOOD_GLUCOSE;
			case "hct":
				return ERROR_MESSAGES.INVALID_HCT;
			case "blood_pressure":
				return ERROR_MESSAGES.INVALID_BLOOD_PRESSURE;
			default:
				return "";
		}
	}
}
