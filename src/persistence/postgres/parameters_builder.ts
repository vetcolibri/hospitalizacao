import { Avdn } from "domain/hospitalization/parameters/avdn.ts";
import { BloodGlucose } from "domain/hospitalization/parameters/blood_glucose.ts";
import { BloodPressure } from "domain/hospitalization/parameters/blood_pressure.ts";
import { Hct } from "domain/hospitalization/parameters/hct.ts";
import { HeartRate } from "domain/hospitalization/parameters/heart_rate.ts";
import { Mucosas } from "domain/hospitalization/parameters/mucosas.ts";
import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { RespiratoryRate } from "domain/hospitalization/parameters/respiratore_rate.ts";
import { Temperature } from "domain/hospitalization/parameters/temperature.ts";
import { Trc } from "domain/hospitalization/parameters/trc.ts";

export interface ParameterModel {
	name: string;
	value: unknown;
	issued_at: string;
}

export class ParameterBuilder {
	private readonly parameters: Parameter[] = [];

	withHeartRate(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("heartRate", model);
		if (!data) return this;

		const { value, issuedAt } = data;
		const heartRate = HeartRate.compose(Number(value), issuedAt);
		this.parameters.push(heartRate);
		return this;
	}

	withRespiratoryRate(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("respiratoryRate", model);
		if (!data) return this;

		const { value, issuedAt } = data;
		const respiratoryRate = RespiratoryRate.compose(Number(value), issuedAt);
		this.parameters.push(respiratoryRate);

		return this;
	}

	withTrc(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("trc", model);
		if (!data) return this;

		const { value, issuedAt } = data;
		const trc = Trc.compose(String(value), issuedAt);
		this.parameters.push(trc);
		return this;
	}

	withAvdn(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("avdn", model);
		if (!data) return this;

		const { value, issuedAt } = data;
		const avdn = Avdn.compose(String(value), issuedAt);
		this.parameters.push(avdn);
		return this;
	}

	withMucosas(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("mucosas", model);
		if (!data) return this;
		const { value, issuedAt } = data;
		const mucosas = Mucosas.compose(String(value), issuedAt);
		this.parameters.push(mucosas);
		return this;
	}

	withTemperature(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("temperature", model);
		if (!data) return this;
		const { value, issuedAt } = data;
		const temperature = Temperature.compose(Number(value), issuedAt);
		this.parameters.push(temperature);
		return this;
	}

	withBloodGlucose(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("bloodGlucose", model);
		if (!data) return this;

		const { value, issuedAt } = data;
		const bloodGlucose = BloodGlucose.compose(Number(value), issuedAt);
		this.parameters.push(bloodGlucose);
		return this;
	}

	withHct(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("hct", model);
		if (!data) return this;

		const { value, issuedAt } = data;
		const hct = Hct.compose(Number(value), issuedAt);
		this.parameters.push(hct);
		return this;
	}

	withBloodPressure(model?: ParameterModel) {
		if (!model) return this;

		const data = this.composeMeasurementData("bloodPressure", model);
		if (!data) return this;

		const { value, issuedAt } = data;
		const bloodPressure = BloodPressure.compose(String(value), issuedAt);
		this.parameters.push(bloodPressure);
		return this;
	}

	build() {
		return this.parameters;
	}

	private composeMeasurementData(name: Parameters, model: ParameterModel) {
		const data = {
			name: String(model.name),
			value: model.value,
			issuedAt: String(model.issued_at),
		};
		const result = Object.values(data).find((value) => value === name);
		if (result) return data;
	}
}

type Parameters =
	| "heartRate"
	| "respiratoryRate"
	| "trc"
	| "avdn"
	| "mucosas"
	| "temperature"
	| "bloodGlucose"
	| "hct"
	| "bloodPressure";
