import { ID } from "../id.ts";
import { Patient } from "../patients/patient.ts";

export enum AlertStatus {
	ENABLE = "ENABLE",
	DISABLE = "DISABLE",
}

export class Alert {
	readonly alertId: ID;
	readonly patient: Patient;
	readonly parameters: string[];
	status: AlertStatus;

	private constructor(patient: Patient) {
		this.alertId = ID.RandomID();
		this.patient = patient;
		this.parameters = [];
		this.status = AlertStatus.ENABLE;
	}

	static create(patient: Patient, parameters: string[]): Alert {
		const alert = new Alert(patient);
		alert.addParameters(parameters);
		return alert;
	}

	addParameters(parameters: string[]): void {
		this.parameters.push(...parameters);
	}

	getStatus(): string {
		return this.status;
	}

	getParameters(): string[] {
		return this.parameters;
	}

	cancel(): void {
		this.status = AlertStatus.DISABLE;
	}
}
