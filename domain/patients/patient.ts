import { Hospitalization, HospitalizationStatus } from "./hospitalization.ts";
import { HospitalizationData, OwnerData, PatientComposeData, PatientData } from "../../shared/types.ts";
import { Either, left, right } from "../../shared/either.ts";
import { BirthDate } from "./birth_date.ts";
import { Owner } from "./owner.ts";
import { ID } from "../id.ts";

export enum PatientStatus {
	HOSPITALIZED = "HOSPITALIZADO",
	DISCHARGED = "ALTA MEDICA",
}

export enum Species {
	CANINE = "CANINO",
	FELINE = "FELINO",
	EXOTIC = "EXÓTICO",
	EXOTIC_MONKEY = "EXÓTICO - MACACO",
	EXOTIC_REPTILE = "EXÓTICO - RÉPTIL",
	EXOTIC_PARROT = "EXÓTICO - PAPAGAIO",
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
	hasAlert = false;

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

	static create(patientData: PatientData, owner: Owner): Patient {
		const { patientId, name, breed, specie, birthDate } = patientData;

		return new Patient(
			ID.New(patientId),
			name,
			breed,
			findSpecie(specie),
			new BirthDate(birthDate),
			owner,
		);
	}

	static compose(patientData: PatientComposeData, ownerData: OwnerData): Patient {
		const { status } = patientData;
		const owner = Owner.create(ownerData);
		const patient = Patient.create(patientData, owner)

		if (PatientStatus.HOSPITALIZED === status){
			patient.status = PatientStatus.HOSPITALIZED;
		}

		if (PatientStatus.DISCHARGED === status){
			patient.status = PatientStatus.DISCHARGED;
		}

		return patient
	}

	hospitalize(data: HospitalizationData): Either<Error, void> {
		const hospitalizationOrError = Hospitalization.create(data);

		if (hospitalizationOrError.isLeft()) return left(hospitalizationOrError.value);

		this.hospitalizations.push(hospitalizationOrError.value);

		this.status = PatientStatus.HOSPITALIZED;

		return right(undefined);
	}

	openHospitalization(): Hospitalization | undefined {
		return this.hospitalizations.find((hospitalization) =>
			hospitalization.status === HospitalizationStatus.OPEN
		);
	}

	discharge(): void {
		const hospitalization = this.openHospitalization();

		if (hospitalization) {
			hospitalization.disable();
			this.status = PatientStatus.DISCHARGED;
		}
	}

	getStatus(): PatientStatus | undefined {
		return this.status;
	}

	changeAlertStatus(status: boolean): void {
		this.hasAlert = status;
	}
}

function findSpecie(name: string): Species {
	const specie = Object.values(Species).find((specie) => specie === name);
	if (specie) return specie;
	return Species.CANINE;
}
