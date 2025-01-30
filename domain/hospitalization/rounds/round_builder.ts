import { MeasurementData } from "application/round_service.ts";
import { Avdn } from "domain/hospitalization/parameters/avdn.ts";
import { BloodGlucose } from "domain/hospitalization/parameters/blood_glucose.ts";
import { BloodPressure } from "domain/hospitalization/parameters/blood_pressure.ts";
import { Hct } from "domain/hospitalization/parameters/hct.ts";
import { HeartRate } from "domain/hospitalization/parameters/heart_rate.ts";
import { Mucosas } from "domain/hospitalization/parameters/mucosas.ts";
import { InvalidParameter } from "domain/hospitalization/parameters/parameter_error.ts";
import { RespiratoryRate } from "domain/hospitalization/parameters/respiratore_rate.ts";
import { Temperature } from "domain/hospitalization/parameters/temperature.ts";
import { Trc } from "domain/hospitalization/parameters/trc.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { Either, left, right } from "shared/either.ts";
import { ErrorMessage } from "shared/error_messages.ts";
import { ID } from "shared/id.ts";

export class RoundBuilder {
	#round: Round;

	constructor(patientId: ID) {
		this.#round = new Round(patientId);
	}

	withHeartRate(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const heartRate = new HeartRate(Number(data.value));
		this.#round.add(heartRate);
		return this;
	}

	withRespiratoryRate(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const respiratoryRate = new RespiratoryRate(Number(data.value));
		this.#round.add(respiratoryRate);
		return this;
	}

	withTrc(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const trc = new Trc(String(data.value));
		this.#round.add(trc);
		return this;
	}

	withAvdn(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const avdn = new Avdn(String(data.value));
		this.#round.add(avdn);
		return this;
	}

	withMucosas(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const mucosas = new Mucosas(String(data.value));
		this.#round.add(mucosas);
		return this;
	}

	withTemperature(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const temperature = new Temperature(Number(data.value));
		this.#round.add(temperature);
		return this;
	}

	withBloodGlucose(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const bloodGlucose = new BloodGlucose(Number(data.value));
		this.#round.add(bloodGlucose);
		return this;
	}

	withHct(data: MeasurementData): RoundBuilder {
		if (!data) return this;
		const hct = new Hct(Number(data.value));
		this.#round.add(hct);
		return this;
	}

	withBloodPressure(data: MeasurementData): RoundBuilder {
		if (!data) return this;

		const bloodPressure = new BloodPressure(String(data.value));
		this.#round.add(bloodPressure);
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
