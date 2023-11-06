import { Hospitalization, HospitalizationStatus } from "./hospitalization.ts";
import { HospitalizationBuilder } from "./hospitalization_builder.ts";
import { ID } from "../id.ts";
import { HospitalizationData } from "../../shared/types.ts";
import { Owner } from "./owner.ts";
import { Either, left, right } from "../../shared/either.ts";

export enum PatientStatus {
	HOSPITALIZED = "HOSPITALIZADO",
	NONHOSPITALIZED = "NAO HOSPITALIZADO",
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
	alertStatus?: boolean = false;

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
		const newHospitalizationOrError = new HospitalizationBuilder()
			.setEntryDate(data.entryDate)
			.setDischargeDate(data.dischargeDate)
			.setEstimatedBudgetDate(data.estimatedBudgetDate)
			.setWeight(data.weight)
			.setBirthDate(data.birthDate)
			.setComplaints(data.complaints)
			.setDiagnostics(data.diagnostics)
			.build();
		if (newHospitalizationOrError.isLeft()) return left(newHospitalizationOrError.value);

		this.hospitalizations.push(newHospitalizationOrError.value);
		this.status = PatientStatus.HOSPITALIZED;

		return right(undefined);
	}

	nonHospitalized() {
		const hospitalization = this.getActiveHospitalization();
		if (hospitalization) {
			hospitalization.down();
			this.status = PatientStatus.NONHOSPITALIZED;
		}
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
