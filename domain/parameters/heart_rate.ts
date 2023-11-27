import { Measurement } from "./measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class HeartRate implements Parameter {
	readonly name: string;
	readonly measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.name = PARAMETER_NAMES.HEART_RATE;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const heartRate = new HeartRate(value);
		heartRate.issuedAt = new Date(issuedAt);
		return heartRate;
	}

	getValue(): number {
		return this.measurement.withNumber();
	}

	isValid(): boolean {
		const value = this.getValue();
		return value >= 1 && value <= 300;
	}
}
