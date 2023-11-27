import { Measurement } from "../parameters/measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class Mucosas implements Parameter {
	readonly name: PARAMETER_NAMES;
	readonly measurement: Measurement;
	issuedAt: Date;

	constructor(value: string) {
		this.name = PARAMETER_NAMES.MUCOSAS;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
	}

	static compose(value: string, issuedAt: string) {
		const mucosas = new Mucosas(value);
		mucosas.issuedAt = new Date(issuedAt);
		return mucosas;
	}

	getValue(): string {
		return this.measurement.withString();
	}

	isValid(): boolean {
		const value = this.getValue();
		return mucosasOptions.includes(value);
	}
}

const mucosasOptions = [
	"Cianoticas",
	"Congestivas",
	"Ictericas",
	"Pálidas",
	"Rosadas",
];
