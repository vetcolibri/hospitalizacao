import { Parameter } from "../../domain/parameters/parameter.ts";
import { RowObject } from "../../deps.ts";
import { HeartRate } from "../../domain/parameters/heart_rate.ts";
import { RespiratoryRate } from "../../domain/parameters/respiratore_rate.ts";
import { Trc } from "../../domain/parameters/trc.ts";
import { Mucosas } from "../../domain/parameters/mucosas.ts";
import { Avdn } from "../../domain/parameters/avdn.ts";
import { Temperature } from "../../domain/parameters/temperature.ts";
import { BloodGlucose } from "../../domain/parameters/blood_glucose.ts";
import { Hct } from "../../domain/parameters/hct.ts";
import { BloodPressure } from "../../domain/parameters/blood_pressure.ts";

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
			const trc = Trc.compose(Number(value), issuedAt);
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

	private composeMeasurementData(name: PARAMETERS, row: RowObject) {
		const data = {
			name: String(row.name),
			value: row.value,
			issuedAt: String(row.issued_at),
		};
		const result = Object.values(data).find((value) => value === name);
		if (result) return data;
	}
}

// export function composeParameter(row: RowObject) {
// 	const measurementData = {
// 		name: String(row.name),
// 		value: row.value,
// 		issuedAt: String(row.issued_at),
// 	};

// 	if (measurementData.name === PARAMETER_NAMES.HEART_RATE) {
// 		const heartRate = HeartRate.compose(
// 			Number(measurementData.value),
// 			measurementData.issuedAt,
// 		);
// 		return heartRate;
// 	}

// 	if (measurementData.name === PARAMETER_NAMES.RESPIRATORY_RATE) {
// 		const respiratoryRate = RespiratoryRate.compose(
// 			Number(measurementData.value),
// 			measurementData.issuedAt,
// 		);
// 		return respiratoryRate;
// 	}
// 	if (measurementData.name === PARAMETER_NAMES.TRC) {
// 		const trc = Trc.compose(Number(measurementData.value), measurementData.issuedAt);
// 		return trc;
// 	}
// 	if (measurementData.name === PARAMETER_NAMES.AVDN) {
// 		const avdn = Avdn.compose(String(measurementData.value), measurementData.issuedAt);
// 		return avdn;
// 	}
// 	if (measurementData.name === PARAMETER_NAMES.MUCOSAS) {
// 		const mucosas = Mucosas.compose(String(measurementData.value), measurementData.issuedAt);
// 		return mucosas;
// 	}
// 	if (measurementData.name === PARAMETER_NAMES.TEMPERATURE) {
// 		const temperature = Temperature.compose(
// 			Number(measurementData.value),
// 			measurementData.issuedAt,
// 		);
// 		return temperature;
// 	}
// 	if (measurementData.name === PARAMETER_NAMES.BLOOD_GLUCOSE) {
// 		const bloodGlucose = BloodGlucose.compose(
// 			Number(measurementData.value),
// 			measurementData.issuedAt,
// 		);
// 		return bloodGlucose;
// 	}
// 	if (measurementData.name === PARAMETER_NAMES.HCT) {
// 		const hct = Hct.compose(Number(measurementData.value), measurementData.issuedAt);
// 		return hct;
// 	}
// 	if (measurementData.name === PARAMETER_NAMES.BLOOD_PRESSURE) {
// 		const bloodPressure = BloodPressure.compose(
// 			String(measurementData.value),
// 			measurementData.issuedAt,
// 		);
// 		return bloodPressure;
// 	}
// }

type PARAMETERS =
	| "heartRate"
	| "respiratoryRate"
	| "trc"
	| "avdn"
	| "mucosas"
	| "temperature"
	| "bloodGlucose"
	| "hct"
	| "bloodPressure";
