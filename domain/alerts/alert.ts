import { ID } from "../id.ts";
import { Patient } from "../patients/patient.ts";

export enum AlertStatus {
	ACTIVE = "active",
	DISABLED = "disabled",
}

export class Alert {
	readonly alertId: ID;
	readonly patient: Patient;
	readonly parameters: string[];
	readonly repeatEvery: number;
	readonly comments: string;
	readonly time: Date;
	status: AlertStatus;

	private constructor(patient: Patient, rate: number, comments: string, time: string) {
		this.alertId = ID.RandomID();
		this.patient = patient;
		this.parameters = [];
		this.repeatEvery = rate;
		this.comments = comments;
		this.time = new Date(time);
		this.status = AlertStatus.ACTIVE;
	}

	static create(
		patient: Patient,
		parameters: string[],
		rate: number,
		comments: string,
		time: string,
	): Alert {
		const alert = new Alert(patient, rate, comments, time);
		alert.addParameters(parameters);
		return alert;
	}

	addParameters(parameters: string[]): void {
		this.parameters.push(...parameters);
	}

	cancel(): void {
		this.status = AlertStatus.DISABLED;
	}

	getStatus(): string {
		return this.status;
	}

	getParameters(): string[] {
		return this.parameters;
	}

	getRate(): number {
		return this.repeatEvery;
	}

	getTime(): string {
		return this.time.toLocaleDateString();
	}
}
