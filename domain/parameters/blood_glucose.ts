import { Measurement } from "./measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class BloodGlucose implements Parameter {
	readonly name: string;
	readonly measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.name = PARAMETER_NAMES.BLOOD_GLUCOSE;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const bloodGlucose = new BloodGlucose(value);
		bloodGlucose.issuedAt = new Date(issuedAt);
		return bloodGlucose;
	}

	getValue(): number {
		return this.measurement.withNumber();
	}

	isValid(): boolean {
		const value = this.getValue();
		return value >= 1 && value <= 300;
	}
}
