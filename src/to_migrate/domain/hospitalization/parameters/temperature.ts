import { Measurement } from "./measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class Temperature implements Parameter {
	name = ParameterName.Temperature;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: number) {
		this.measurement = Measurement.fromNumber(value);
		this.issuedAt = new Date();
	}

	static compose(value: number, issuedAt: string) {
		const temperature = new Temperature(value);
		temperature.issuedAt = new Date(issuedAt);
		return temperature;
	}

	isValid(): boolean {
		return this.value >= 1 && this.value <= 100;
	}

	get value(): number {
		return this.measurement.toNumber();
	}
}
