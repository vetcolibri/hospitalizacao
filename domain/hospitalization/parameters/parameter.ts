import { Measurement } from "./measurement.ts";

export interface Parameter {
	name: string;
	measurement: Measurement;
	issuedAt: Date;
	value: unknown;

	isValid(): boolean;
}

export enum ParameterName {
	Avdn = "avdn",
	BloodGlucose = "bloodGlucose",
	BloodPressure = "bloodPressure",
	Hct = "hct",
	HeartRate = "heartRate",
	Mucosas = "mucosas",
	RespiratoryRate = "respiratoryRate",
	Trc = "trc",
	Temperature = "temperature",
}
