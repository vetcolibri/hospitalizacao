import { RowObject } from "deps";
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

export class ParametersBuilder {
	private readonly parameters: Parameter[] = [];

	withHeartRate(row: RowObject) {
		const data = this.composeMeasurementData("heartRate", row);
		if (data) {
			const { value, issuedAt } = data;
			const heartRate = HeartRate.compose(Number(value), issuedAt);
			this.parameters.push(heartRate);
		}
		return this;
	}

	withRespiratoryRate(row: RowObject) {
		const data = this.composeMeasurementData("respiratoryRate", row);
		if (data) {
			const { value, issuedAt } = data;
			const respiratoryRate = RespiratoryRate.compose(Number(value), issuedAt);
			this.parameters.push(respiratoryRate);
		}
		return this;
	}

	withTrc(row: RowObject) {
		const data = this.composeMeasurementData("trc", row);
		if (data) {
			const { value, issuedAt } = data;
			const trc = Trc.compose(String(value), issuedAt);
			this.parameters.push(trc);
		}
		return this;
	}

	withAvdn(row: RowObject) {
		const data = this.composeMeasurementData("avdn", row);
		if (data) {
			const { value, issuedAt } = data;
			const avdn = Avdn.compose(String(value), issuedAt);
			this.parameters.push(avdn);
		}
		return this;
	}

	withMucosas(row: RowObject) {
		const data = this.composeMeasurementData("mucosas", row);
		if (data) {
			const { value, issuedAt } = data;
			const mucosas = Mucosas.compose(String(value), issuedAt);
			this.parameters.push(mucosas);
		}
		return this;
	}

	withTemperature(row: RowObject) {
		const data = this.composeMeasurementData("temperature", row);
		if (data) {
			const { value, issuedAt } = data;
			const temperature = Temperature.compose(Number(value), issuedAt);
			this.parameters.push(temperature);
		}
		return this;
	}

	withBloodGlucose(row: RowObject) {
		const data = this.composeMeasurementData("bloodGlucose", row);
		if (data) {
			const { value, issuedAt } = data;
			const bloodGlucose = BloodGlucose.compose(Number(value), issuedAt);
			this.parameters.push(bloodGlucose);
		}
		return this;
	}

	withHct(row: RowObject) {
		const data = this.composeMeasurementData("hct", row);
		if (data) {
			const { value, issuedAt } = data;
			const hct = Hct.compose(Number(value), issuedAt);
			this.parameters.push(hct);
		}
		return this;
	}

	withBloodPressure(row: RowObject) {
		const data = this.composeMeasurementData("bloodPressure", row);
		if (data) {
			const { value, issuedAt } = data;
			const bloodPressure = BloodPressure.compose(String(value), issuedAt);
			this.parameters.push(bloodPressure);
		}
		return this;
	}

	build() {
		return this.parameters;
	}

	private composeMeasurementData(name: Parameters, row: RowObject) {
		const data = {
			name: String(row.name),
			value: row.value,
			issuedAt: String(row.issued_at),
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
