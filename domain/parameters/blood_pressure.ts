import { Measurement } from "../parameters/measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";
import { User } from "../users/user.ts";

export class BloodPressure implements Parameter {
	readonly name: PARAMETER_NAMES;
	readonly measurement: Measurement;
	readonly user: User;
	readonly issuedAt: Date;

	constructor(value: string, user: User) {
		this.name = PARAMETER_NAMES.BLOOD_PRESSURE;
		this.measurement = Measurement.new(value);
		this.issuedAt = new Date();
		this.user = user;
	}

	getValue(): string {
		return this.measurement.withString();
	}

	convertToArray(): string[] {
		const value = this.getValue();
		const pattern = /(\d+)/g;
		const matches = value.match(pattern);
		return matches!;
	}

	getSis(): number {
		const values = this.convertToArray();
		const sis = parseFloat(values?.at(0)!);
		return sis;
	}

	getDis(): number {
		const values = this.convertToArray();
		const dis = parseFloat(values?.at(1)!);
		return dis;
	}

	getPam(): number {
		const values = this.convertToArray();
		const pam = parseFloat(values?.at(2)!);
		return pam;
	}

	isValid(): boolean {
		const sis = this.getSis();
		const dis = this.getDis();
		const pam = this.getPam();
		const validSis = sis > 1 && sis < 280;
		const validDis = dis > 1 && dis < 180;
		const validPam = pam > 1 && pam < 200;
		return validSis && validDis && validPam;
	}
}
