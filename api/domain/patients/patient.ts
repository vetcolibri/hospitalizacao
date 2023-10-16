import { Hospitalization, HospitalizationStatus } from "./hospitalization.ts";
import { ID } from "../id.ts";

export enum PatientStatus {
	HOSPITALIZED = "HOSPITALIZADO",
}

export enum PatientSpecie {
	CANINE = "CANINO",
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

	hospitalize(entryDate: string, dischargeDate: string, estimatedBudgetDate: string): void {
		const newHospitalization = new Hospitalization(
			entryDate,
			dischargeDate,
			estimatedBudgetDate,
		);
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
