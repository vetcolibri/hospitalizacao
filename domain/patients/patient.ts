import { Hospitalization, Status } from "./hospitalization.ts";
import { ID } from "../id.ts";
import { HospitalizationData, PatientData } from "../../shared/types.ts";
import { Owner } from "./owner.ts";
import { Either, left, right } from "../../shared/either.ts";
import { BirthDate } from "./birth_date.ts";

export enum PatientStatus {
	HOSPITALIZED = "HOSPITALIZADO",
	DISCHARGED = "ALTA MEDICA",
}

export enum Species {
	CANINE = "CANINO",
	FELINE = "FELINO",
	EXOTIC = "EXÓTICO",
	BIRDS = "AVES",
}

export class Patient {
	readonly patientId: ID;
	readonly name: string;
	readonly specie: Species;
	readonly breed: string;
	readonly owner: Owner;
	readonly hospitalizations: Hospitalization[];
	birthDate: BirthDate;
	status?: PatientStatus;
	alertStatus = false;

	private constructor(
		id: ID,
		name: string,
		breed: string,
		specie: Species,
		birthDate: BirthDate,
		owner: Owner,
	) {
		this.patientId = id;
		this.name = name;
		this.breed = breed;
		this.owner = owner;
		this.specie = specie;
		this.birthDate = birthDate;
		this.hospitalizations = [];
	}

	static create(patientData: PatientData, owner: Owner) {
		const { patientId, name, breed, specie, birthDate } = patientData;

		const patientBirthDate = new BirthDate(birthDate);

		const patientSpecie = findSpecie(specie);

		return new Patient(ID.New(patientId), name, breed, patientSpecie, patientBirthDate, owner);
	}

	getStatus(): PatientStatus | undefined {
		return this.status;
	}

	hospitalize(data: HospitalizationData): Either<Error, void> {
		const hospitalizationOrError = Hospitalization.create(data);

		if (hospitalizationOrError.isLeft()) return left(hospitalizationOrError.value);

		this.hospitalizations.push(hospitalizationOrError.value);

		this.status = PatientStatus.HOSPITALIZED;

		return right(undefined);
	}

	discharge(): void {
		const hospitalization = this.activeHospitalization();

		if (hospitalization) {
			hospitalization.disable();
			this.status = PatientStatus.DISCHARGED;
		}
	}

	activeHospitalization(): Hospitalization | undefined {
		const hospitalization = this.hospitalizations.find((hospitalization) =>
			hospitalization.status === Status.OPEN
		);

		return hospitalization;
	}

	changeAlertStatus(status: boolean): void {
		this.alertStatus = status;
	}
}

function findSpecie(specie: string): Species {
	switch (specie) {
		case "CANINO":
			return Species.CANINE;
		case "FELINO":
			return Species.FELINE;
		case "EXÓTICO":
			return Species.EXOTIC;
		case "AVES":
			return Species.BIRDS;
		default:
			return Species.CANINE;
	}
}
