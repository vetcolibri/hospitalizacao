import { Measurement } from "domain/parameters/measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class Hct implements Parameter {
	name = ParameterName.Hct;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.measurement = Measurement.fromNumber(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const hct = new Hct(value);
		hct.issuedAt = new Date(issuedAt);
		return hct;
	}

	isValid(): boolean {
		return this.value >= 1 && this.value <= 100;
	}

	get value(): number {
		return this.measurement.toNumber();
	}
}
