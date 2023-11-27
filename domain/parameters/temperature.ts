import { Measurement } from "../parameters/measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class Temperature implements Parameter {
	readonly name: string;
	readonly measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.name = PARAMETER_NAMES.TEMPERATURE;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const temperature = new Temperature(value);
		temperature.issuedAt = new Date(issuedAt);
		return temperature;
	}

	getValue(): number {
		return this.measurement.withNumber();
	}

	isValid(): boolean {
		const value = this.getValue();
		return value >= 1 && value <= 100;
	}
}
