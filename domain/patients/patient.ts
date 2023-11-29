import { Hospitalization, HospitalizationStatus } from "./hospitalization.ts";
import { HospitalizationData, PatientData } from "../../shared/types.ts";
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
	status?: PatientStatus;
	birthDate: BirthDate;
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
		const birth = new BirthDate(birthDate);
		const findedSpecie = findSpecie(specie);

		return new Patient(
			ID.New(patientId),
			name,
			breed,
			findedSpecie,
			birth,
			owner,
		);
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
