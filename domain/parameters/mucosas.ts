import { Measurement } from "../parameters/measurement.ts";
import { PARAMETER, Parameter } from "./parameter.ts";
import { User } from "../users/user.ts";

export class Mucosas implements Parameter {
	readonly name: PARAMETER;
	readonly measurement: Measurement;
	readonly user: User;
	readonly issuedAt: Date;

	constructor(value: string, user: User) {
		this.name = PARAMETER.MUCOSAS;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
		this.user = user;
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
