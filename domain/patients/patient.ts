import { Hospitalization, HospitalizationStatus } from "./hospitalization.ts";
import { HospitalizationBuilder } from "./hospitalization_builder.ts";
import { ID } from "../id.ts";
import { HospitalizationData } from "../../shared/types.ts";
import { Owner } from "./owner.ts";
import { Either, left, right } from "../../shared/either.ts";

export enum PatientStatus {
	HOSPITALIZED = "HOSPITALIZADO",
	DISCHARGED = "ALTA MEDICA",
}

export enum PatientSpecie {
	CANINE = "CANINO",
	FELINE = "FELINO",
}

export class Patient {
	readonly patientId: ID;
	readonly name: string;
	readonly specie: PatientSpecie;
	readonly hospitalizations: Hospitalization[];
	readonly breed: string;
	readonly owner: Owner;
	status?: PatientStatus;
	alertStatus = false;

	constructor(id: string, name: string, breed: string, owner: Owner, specie?: string) {
		this.patientId = ID.New(id);
		this.name = name;
		this.breed = breed;
		this.owner = owner;
		this.specie = PatientSpecie.CANINE;
		this.hospitalizations = [];
		if (specie && specie !== PatientSpecie.CANINE) {
			this.specie = PatientSpecie.FELINE;
		}
	}

	getStatus(): PatientStatus | undefined {
		return this.status;
	}

	hospitalize(data: HospitalizationData): Either<Error, void> {
		const hospitalizationOrError = new HospitalizationBuilder()
			.setBirthDate(data.birthDate)
			.setWeight(data.weight)
			.setComplaints(data.complaints)
			.setDiagnostics(data.diagnostics)
			.setEntryDate(data.entryDate)
			.setDischargeDate(data.dischargeDate)
			.setBudget(data.budget)
			.build();
		if (hospitalizationOrError.isLeft()) return left(hospitalizationOrError.value);

		this.hospitalizations.push(hospitalizationOrError.value);
		this.status = PatientStatus.HOSPITALIZED;
		return right(undefined);
	}

	discharge() {
		const hospitalization = this.activeHospitalization();
		if (hospitalization) {
			hospitalization.disable();
			this.status = PatientStatus.DISCHARGED;
		}
	}

	activeHospitalization(): Hospitalization | undefined {
		const hospitalization = this.hospitalizations.find((hospitalization) =>
			hospitalization.status === HospitalizationStatus.ACTIVE
		);
		return hospitalization;
	}

	changeAlertStatus(status: boolean): void {
		this.alertStatus = status;
	}
}
