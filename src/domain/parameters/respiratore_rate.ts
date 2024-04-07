import { Measurement } from "domain/parameters/measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class RespiratoryRate implements Parameter {
	name = ParameterName.RespiratoryRate;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.measurement = Measurement.fromNumber(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const respiratoryRate = new RespiratoryRate(value);
		respiratoryRate.issuedAt = new Date(issuedAt);
		return respiratoryRate;
	}

	isValid(): boolean {
		return this.value >= 1 && this.value <= 100;
	}

	get value(): number {
		return this.measurement.toNumber();
	}
}
