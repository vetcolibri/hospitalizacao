import { Measurement } from "./measurement.ts";
import { Parameter, PARAMETER_NAMES } from "./parameter.ts";

export class Trc implements Parameter {
  readonly name: string;
  readonly measurement: Measurement;
  issuedAt: Date;

  constructor(value: number) {
    this.name = PARAMETER_NAMES.TRC;
    this.measurement = Measurement.new(value);
    this.issuedAt = new Date();
  }

  static compose(value: number, issuedAt: string) {
    const trc = new Trc(value);
    trc.issuedAt = new Date(issuedAt);
    return trc;
  }

  get value(): number {
    return this.measurement.withNumber();
  }

  isValid(): boolean {
    const value = this.value;
    return value >= 1 && value <= 10;
  }
}
