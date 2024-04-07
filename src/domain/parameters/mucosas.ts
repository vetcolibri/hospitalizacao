import { Measurement } from "domain/parameters/measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class Mucosas implements Parameter {
	name = ParameterName.Mucosas;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: string) {
		this.measurement = Measurement.fromString(value);
		this.issuedAt = new Date();
	}

	static compose(value: string, issuedAt: string) {
		const mucosas = new Mucosas(value);
		mucosas.issuedAt = new Date(issuedAt);
		return mucosas;
	}

	isValid(): boolean {
		return MUCOSAS_OPTIONS.includes(this.value);
	}

	get value(): string {
		return this.measurement.toString();
	}
}

const MUCOSAS_OPTIONS = [
	"Cianoticas",
	"Congestivas",
	"Ictericas",
	"Pálidas",
	"Rosadas",
];
