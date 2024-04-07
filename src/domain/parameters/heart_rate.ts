import { Measurement } from "./measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class HeartRate implements Parameter {
	name = ParameterName.HeartRate;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.measurement = Measurement.fromNumber(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const heartRate = new HeartRate(value);
		heartRate.issuedAt = new Date(issuedAt);
		return heartRate;
	}

	isValid(): boolean {
		return this.value >= 1 && this.value <= 300;
	}

	get value(): number {
		return this.measurement.toNumber();
	}
}
