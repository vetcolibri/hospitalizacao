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
	readonly entryDate: Date;
	status: HospitalizationStatus;

	constructor(entryDate: string) {
		this.entryDate = new Date(entryDate);
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

	hospitalize(entryDate: string): void {
		const newHospitalization = new Hospitalization(entryDate);
		this.hospitalizations.push(newHospitalization);
		this.status = PatientStatus.HOSPITALIZED;
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
