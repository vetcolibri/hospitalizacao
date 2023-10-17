import { Hospitalization, HospitalizationStatus } from "./hospitalization.ts";
import { HospitalizadBuilder } from "./hospitalization_builder.ts";
import { ID } from "../id.ts";
import { HospitalizationData } from "../../shared/types.ts";

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

	hospitalize(data: HospitalizationData): void {
		const newHospitalization = new HospitalizadBuilder()
			.setEntryDate(data.entryDate)
			.setDischargeDate(data.dischargeDate)
			.setEstimatedBudgetDate(data.estimatedBudgetDate)
			.setWeight(data.weight)
			.setAge(data.age)
			.setComplaints(data.complaints)
			.setDiagnostics(data.diagnostics)
			.build();
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
