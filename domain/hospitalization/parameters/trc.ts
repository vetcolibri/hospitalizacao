import { Measurement } from "./measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class Trc implements Parameter {
	name = ParameterName.Trc;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: string) {
		this.measurement = Measurement.fromString(value);
		this.issuedAt = new Date();
	}

	static compose(value: string, issuedAt: string) {
		const trc = new Trc(value);
		trc.issuedAt = new Date(issuedAt);
		return trc;
	}

	isValid(): boolean {
		if (this.value === "Menor que 2'") return true;

		if (this.value === "Maior que 2'") return true;

		return false;
	}

	get value(): string {
		return this.measurement.toString();
	}
}
