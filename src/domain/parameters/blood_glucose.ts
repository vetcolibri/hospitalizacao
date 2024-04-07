import { Measurement } from "./measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class BloodGlucose implements Parameter {
	name = ParameterName.BloodGlucose;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.measurement = Measurement.fromNumber(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const bloodGlucose = new BloodGlucose(value);
		bloodGlucose.issuedAt = new Date(issuedAt);
		return bloodGlucose;
	}

	isValid(): boolean {
		return this.value >= 1 && this.value <= 300;
	}

	get value(): number {
		return this.measurement.toNumber();
	}
}
