import { Measurement } from "../parameters/measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";
import { User } from "../users/user.ts";

export class RespiratoryRate implements Parameter {
	readonly name: string;
	readonly measurement: Measurement;
	readonly user: User;
	readonly issuedAt: Date;

	constructor(value: number, user: User) {
		this.name = PARAMETER_NAMES.RESPIRATORY_RATE;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
		this.user = user;
	}

	getValue(): number {
		return this.measurement.withNumber();
	}

	isValid(): boolean {
		const value = this.getValue();
		return value >= 1 && value <= 100;
	}
}
