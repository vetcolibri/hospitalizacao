import { ID } from "../id.ts";
import { Patient } from "../patients/patient.ts";

export enum AlertStatus {
	ENABLE = "ENABLE",
}

export class Alert {
	readonly alertId: ID;
	readonly patient: Patient;
	readonly parameters: string[];
	status: AlertStatus;

	constructor(patient: Patient) {
		this.alertId = ID.RandomID();
		this.patient = patient;
		this.parameters = [];
		this.status = AlertStatus.ENABLE;
	}

	setParameters(parameters: string[]): void {
		this.parameters.push(...parameters);
	}

	getStatus(): string {
		return this.status;
	}

	getParameters(): string[] {
		return this.parameters;
	}
}
