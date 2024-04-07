import { Measurement } from "domain/parameters/measurement.ts";
import { Parameter, ParameterName } from "./parameter.ts";

export class BloodPressure implements Parameter {
	name = ParameterName.BloodPressure;
	measurement: Measurement;
	issuedAt: Date;

	constructor(value: string) {
		this.measurement = Measurement.fromString(value);
		this.issuedAt = new Date();
	}

	static compose(value: string, issuedAt: string) {
		const bloodPressure = new BloodPressure(value);
		bloodPressure.issuedAt = new Date(issuedAt);
		return bloodPressure;
	}

	convertToArray(): string[] {
		const value = this.value;
		const pattern = /(\d+)/g;
		const matches = value.match(pattern);
		return matches!;
	}

	getSis(): number {
		const values = this.convertToArray();
		return parseFloat(values?.at(0)!);
	}

	getDis(): number {
		const values = this.convertToArray();
		return parseFloat(values?.at(1)!);
	}

	getPam(): number {
		const values = this.convertToArray();
		return parseFloat(values?.at(2)!);
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

	get value(): string {
		return this.measurement.toString();
	}
}
