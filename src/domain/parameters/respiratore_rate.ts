import { Measurement } from "domain/parameters/measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class RespiratoryRate implements Parameter {
  readonly name: string;
  readonly measurement: Measurement;
  issuedAt: Date;

  constructor(value: number) {
    this.name = PARAMETER_NAMES.RESPIRATORY_RATE;
    this.measurement = Measurement.new(value);
    this.issuedAt = new Date();
  }

  static compose(value: number, issuedAt: string) {
    const respiratoryRate = new RespiratoryRate(value);
    respiratoryRate.issuedAt = new Date(issuedAt);
    return respiratoryRate;
  }

  get value(): number {
    return this.measurement.withNumber();
  }

  isValid(): boolean {
    const value = this.value;
    return value >= 1 && value <= 100;
  }
}
