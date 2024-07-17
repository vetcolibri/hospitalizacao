import { Measurement } from "./measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class Avdn implements Parameter {
	name = ParameterName.Avdn;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: string) {
		this.measurement = Measurement.fromString(value);
		this.issuedAt = new Date();
	}

	static compose(value: string, issuedAt: string) {
		const avdn = new Avdn(value);
		avdn.issuedAt = new Date(issuedAt);
		return avdn;
	}

	isValid(): boolean {
		return AVDN_OPTIONS.includes(this.value);
	}

	get value(): string {
		return this.measurement.toString();
	}
}

const AVDN_OPTIONS = ["Alerta", "Doloroso", "Verbal", "Não responsivo"];
