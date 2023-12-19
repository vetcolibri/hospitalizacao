import { Either, left, right } from "shared/either.ts";
import { AlertData } from "shared/types.ts";
import { ID } from "shared/id.ts";
import { Patient } from "domain/patients/patient.ts";
import { RepeatEvery } from "./repeat_every.ts";
import { InvalidRepeatEvery } from "./repeat_every_error.ts";

export enum AlertStatus {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

export class Alert {
  alertId: ID;
  readonly patient: Patient;
  readonly parameters: string[];
  readonly repeatEvery: RepeatEvery;
  readonly comments: string;
  readonly time: Date;
  status: AlertStatus;

  private constructor(
    patient: Patient,
    rate: RepeatEvery,
    comments: string,
    time: string
  ) {
    this.alertId = ID.RandomID();
    this.patient = patient;
    this.parameters = [];
    this.repeatEvery = rate;
    this.comments = comments;
    this.time = new Date(time);
    this.status = AlertStatus.ENABLED;
  }

  static create(
    patient: Patient,
    data: AlertData
  ): Either<InvalidRepeatEvery, Alert> {
    const { rate, comments, time, parameters } = data;
    const repeatEvery = new RepeatEvery(rate);
    if (!repeatEvery.isValid()) {
      return left(new InvalidRepeatEvery());
    }

    const alert = new Alert(patient, repeatEvery, comments, time);
    alert.addParameters(parameters);

    return right(alert);
  }

  addParameters(parameters: string[]): void {
    this.parameters.push(...parameters);
  }

  cancel(): void {
    this.status = AlertStatus.DISABLED;
  }

  isDisabled(): boolean {
    return this.status === AlertStatus.DISABLED;
  }

  getStatus(): string {
    return this.status;
  }

  getParameters(): string[] {
    return this.parameters;
  }

  getRate(): number {
    return this.repeatEvery.value;
  }

  getTime(): string {
    return this.time.toISOString();
  }
}
