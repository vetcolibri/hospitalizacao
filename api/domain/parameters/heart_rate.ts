import { Measurement } from "./measurement.ts";
import { PARAMETER, Parameter } from "./parameter.ts";
import { User } from "../users/user.ts";

export class HeartRate implements Parameter {
	readonly name: string;
	readonly measurement: Measurement;
	readonly user: User;
	readonly issuedAt: Date;

	constructor(value: number, date: string, user: User) {
		this.name = PARAMETER.HEART_RATE;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date(date);
		this.user = user;
	}

	getValue(): number {
		return this.measurement.withNumber();
	}

	isValid(): boolean {
		const value = this.getValue();
		return value >= 1 && value <= 300;
	}
}
