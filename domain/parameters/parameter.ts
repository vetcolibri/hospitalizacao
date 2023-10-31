import { Measurement } from "../parameters/measurement.ts";
import { User } from "../users/user.ts";

export interface Parameter {
	readonly name: string;
	readonly measurement: Measurement;
	readonly user: User;
	readonly issuedAt: Date;

	getValue(): unknown;
	isValid(): boolean;
}

export enum PARAMETER_NAMES {
	HEART_RATE = "heartRate",
	RESPIRATORY_RATE = "respiratoryRate",
	TRC = "trc",
	AVDN = "avdn",
	TEMPERATURE = "temperature",
	MUCOSAS = "mucosas",
	BLOOD_GLUCOSE = "bloodGlucose",
	HCT = "hct",
	BLOOD_PRESSURE = "bloodPressure",
}
