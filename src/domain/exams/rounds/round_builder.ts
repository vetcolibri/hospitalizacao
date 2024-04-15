import { Round } from "../rounds/round.ts";
import { HeartRate } from "../parameters/heart_rate.ts";
import { Either, left, right } from "shared/either.ts";
import { RespiratoryRate } from "../parameters/respiratore_rate.ts";
import { Trc } from "../parameters/trc.ts";
import { Temperature } from "../parameters/temperature.ts";
import { Avdn } from "../parameters/avdn.ts";
import { Mucosas } from "../parameters/mucosas.ts";
import { BloodGlucose } from "../parameters/blood_glucose.ts";
import { Hct } from "../parameters/hct.ts";
import { BloodPressure } from "../parameters/blood_pressure.ts";
import { InvalidParameter } from "../parameters/parameter_error.ts";
import { ErrorMessage } from "shared/error_messages.ts";
import { MeasurementData } from "application/round_service.ts";
import { ID } from "shared/id.ts";

export class RoundBuilder {
	#round: Round;

	constructor(patientId: ID) {
		this.#round = new Round(patientId);
	}

	withHeartRate(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const heartRate = new HeartRate(Number(data.value));
		this.#round.addParameter(heartRate);
		return this;
	}

	withRespiratoryRate(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const respiratoryRate = new RespiratoryRate(Number(data.value));
		this.#round.addParameter(respiratoryRate);
		return this;
	}

	withTrc(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const trc = new Trc(String(data.value));
		this.#round.addParameter(trc);
		return this;
	}

	withAvdn(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const avdn = new Avdn(String(data.value));
		this.#round.addParameter(avdn);
		return this;
	}

	withMucosas(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const mucosas = new Mucosas(String(data.value));
		this.#round.addParameter(mucosas);
		return this;
	}

	withTemperature(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const temperature = new Temperature(Number(data.value));
		this.#round.addParameter(temperature);
		return this;
	}

	withBloodGlucose(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const bloodGlucose = new BloodGlucose(Number(data.value));
		this.#round.addParameter(bloodGlucose);
		return this;
	}

	withHct(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const hct = new Hct(Number(data.value));
		this.#round.addParameter(hct);
		return this;
	}

	withBloodPressure(data: MeasurementData): RoundBuilder {
		if (!data) return this;

		const bloodPressure = new BloodPressure(String(data.value));
		this.#round.addParameter(bloodPressure);
		return this;
	}

	build(): Either<Error, Round> {
		for (const parameter of this.#round.parameters) {
			if (parameter.isValid()) continue;

			const error = this.findError(parameter.name);

			return left(new InvalidParameter(error));
		}
		return right(this.#round);
	}

	private findError(name: string): string {
		switch (name) {
			case "heart_rate":
				return ErrorMessage.InvalidHeartRate;
			case "respiratory_rate":
				return ErrorMessage.InvalidRespiratoryRate;
			case "trc":
				return ErrorMessage.InvalidTrc;
			case "avdn":
				return ErrorMessage.InvalidAvdn;
			case "mucosas":
				return ErrorMessage.InvalidMucosas;
			case "temperature":
				return ErrorMessage.InvalidTemperature;
			case "blood_glucose":
				return ErrorMessage.InvalidBloodGlucose;
			case "hct":
				return ErrorMessage.InvalidHct;
			case "blood_pressure":
				return ErrorMessage.InvalidBloodPressure;
			default:
				return "";
		}
	}
}
