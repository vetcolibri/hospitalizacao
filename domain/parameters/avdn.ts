import { Measurement } from "./measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class Avdn implements Parameter {
	readonly name: PARAMETER_NAMES;
	readonly measurement: Measurement;
	issuedAt: Date;

	constructor(value: string) {
		this.name = PARAMETER_NAMES.AVDN;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
	}

	static compose(value: string, issuedAt: string) {
		const avdn = new Avdn(value);
		avdn.issuedAt = new Date(issuedAt);
		return avdn;
	}

	getValue(): string {
		return this.measurement.withString();
	}

	isValid(): boolean {
		const value = this.getValue();
		return AvdnOptions.includes(value);
	}
}

const AvdnOptions = [
	"Alerta",
	"Doloroso",
	"Verbal",
	"Não responsivo",
];
