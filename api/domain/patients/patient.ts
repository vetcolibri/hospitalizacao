import { ID } from "../id.ts";

export enum PatientStatus {
	HOSPITALIZED = "HOSPITALIZADO",
}

export enum PatientSpecie {
	CANINE = "CANINO",
}

export class Patient {
	readonly patientId: ID;
	readonly status: PatientStatus;
	readonly specie: PatientSpecie;
	alertStatus: boolean;

	constructor(id: string) {
		this.patientId = ID.New(id);
		this.status = PatientStatus.HOSPITALIZED;
		this.alertStatus = false;
		this.specie = PatientSpecie.CANINE;
	}

	getStatus(): PatientStatus {
		return this.status;
	}

	changeAlertStatus(status: boolean): void {
		this.alertStatus = status;
	}
}
