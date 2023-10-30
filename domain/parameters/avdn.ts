import { Measurement } from "./measurement.ts";
import { PARAMETER, Parameter } from "./parameter.ts";
import { User } from "../users/user.ts";

export class Avdn implements Parameter {
	readonly name: PARAMETER;
	readonly measurement: Measurement;
	readonly user: User;
	readonly issuedAt: Date;

	constructor(value: string, issuedAt: string, user: User) {
		this.name = PARAMETER.AVDN;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date(issuedAt);
		this.user = user;
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
