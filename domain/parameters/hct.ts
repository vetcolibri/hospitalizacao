import { Measurement } from "../parameters/measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class Hct implements Parameter {
	readonly name: string;
	readonly measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.name = PARAMETER_NAMES.HCT;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const hct = new Hct(value);
		hct.issuedAt = new Date(issuedAt);
		return hct;
	}

	getValue(): number {
		return this.measurement.withNumber();
	}

	isValid(): boolean {
		const value = this.getValue();
		return value >= 1 && value <= 100;
	}
}
