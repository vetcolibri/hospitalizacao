import { ID } from "../id.ts";

export enum PatientStatus {
	HOSPITALIZED = "HOSPITALIZADO",
}

export enum HospitalizationStatus {
	ACTIVE = "ATIVA",
}

export enum PatientSpecie {
	CANINE = "CANINO",
}

export class Hospitalization {
	readonly issuedAt: Date;
	status: HospitalizationStatus;

	constructor(date: string) {
		this.issuedAt = new Date(date);
		this.status = HospitalizationStatus.ACTIVE;
	}
}

export class Patient {
	readonly patientId: ID;
	readonly name: string;
	readonly specie: PatientSpecie;
	readonly hospitalizations: Hospitalization[];
	status?: PatientStatus;
	alertStatus?: boolean = false;

	constructor(id: string, name: string) {
		this.patientId = ID.New(id);
		this.name = name;
		this.specie = PatientSpecie.CANINE;
		this.hospitalizations = [];
	}

	getStatus(): PatientStatus | undefined {
		return this.status;
	}

	hospitalize(newHospitalization: Hospitalization): void {
		this.status = PatientStatus.HOSPITALIZED;
		this.hospitalizations.push(newHospitalization);
	}

	getActiveHospitalization(): Hospitalization | undefined {
		const hospitalization = this.hospitalizations.find((hospitalization) =>
			hospitalization.status === HospitalizationStatus.ACTIVE
		);
		return hospitalization;
	}

	changeAlertStatus(status: boolean): void {
		this.alertStatus = status;
	}
}
