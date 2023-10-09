import { ID } from "../id.ts";
import { Patient } from "../patients/patient.ts";

export enum AlertStatus {
	ENABLE = "ENABLE",
}

export class Alert {
	readonly alertId: ID;
	readonly patient: Patient;
	status: AlertStatus;

	constructor(patient: Patient) {
		this.alertId = ID.RandomID();
		this.patient = patient;
		this.status = AlertStatus.ENABLE;
	}
}
