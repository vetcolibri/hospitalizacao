import { Measurement } from "domain/parameters/measurement.ts";

export interface Parameter {
  readonly name: string;
  readonly measurement: Measurement;
  readonly issuedAt: Date;

  value: unknown;
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
