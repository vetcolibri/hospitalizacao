import { Hospitalization, HospitalizationStatus } from "./hospitalization.ts";
import { HospitalizationData } from "shared/types.ts";
import { Either, left, right } from "shared/either.ts";
import { BirthDate } from "./birth_date.ts";
import { Owner } from "./owner.ts";
import { ID } from "shared/id.ts";

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
	readonly systemId: ID;
	readonly patientId: ID;
	readonly name: string;
	readonly specie: Species;
	readonly breed: string;
	readonly owner: Owner;
	#hospitalizations: Hospitalization[];
	status?: PatientStatus;
	birthDate: BirthDate;
	hasAlert = false;

	constructor(
		systemId: ID,
		patientId: ID,
		name: string,
		breed: string,
		specie: Species,
		birthDate: string,
		owner: Owner,
	) {
		this.systemId = systemId;
		this.patientId = patientId;
		this.name = name;
		this.breed = breed;
		this.owner = owner;
		this.specie = findSpecie(specie);
		this.birthDate = new BirthDate(birthDate);
		this.#hospitalizations = [];
	}

	addHospitalizations(hospitalizations: Hospitalization[]): void {
		this.#hospitalizations = hospitalizations;
	}

	hospitalize(data: HospitalizationData): Either<Error, void> {
		const hospitalizationOrError = Hospitalization.create(data);

		if (hospitalizationOrError.isLeft()) {
			return left(hospitalizationOrError.value);
		}

		this.#hospitalizations.push(hospitalizationOrError.value);

		this.status = PatientStatus.HOSPITALIZED;

		return right(undefined);
	}

	openHospitalization(): Hospitalization | undefined {
		return this.#hospitalizations.find(
			(hospitalization) => hospitalization.status === HospitalizationStatus.OPEN,
		);
	}

	discharge(): void {
		const hospitalization = this.openHospitalization();

		if (hospitalization) {
			hospitalization.disable();
			this.status = PatientStatus.DISCHARGED;
		}
	}

	changeAlertStatus(status: boolean): void {
		this.hasAlert = status;
	}

	getStatus(): PatientStatus | undefined {
		return this.status;
	}

	get hospitalizations(): Hospitalization[] {
		return this.#hospitalizations;
	}
}

function findSpecie(name: string): Species {
	const specie = Object.values(Species).find((specie) => specie === name);
	if (specie) return specie;
	return Species.CANINE;
}

export class PatientBuilder {
	#systemId?: ID;
	#patientId?: ID;
	#name?: string;
	#specie?: Species;
	#breed?: string;
	#owner?: Owner;
	#birthDate?: string;
	#hospitalizations?: Hospitalization[];
	#status?: PatientStatus;
	#alertStatus?: boolean;

	withSystemId(systemId: ID): PatientBuilder {
		this.#systemId = systemId;
		return this;
	}

	withPatientId(patientId: ID): PatientBuilder {
		this.#patientId = patientId;
		return this;
	}

	withName(name: string): PatientBuilder {
		this.#name = name;
		return this;
	}

	withSpecie(specie: string): PatientBuilder {
		this.#specie = findSpecie(specie);
		return this;
	}

	withBreed(breed: string): PatientBuilder {
		this.#breed = breed;
		return this;
	}

	withOwner(owner: Owner): PatientBuilder {
		this.#owner = owner;
		return this;
	}

	withHospitalizations(hospitalizations: Hospitalization[]): PatientBuilder {
		this.#hospitalizations = hospitalizations;
		return this;
	}

	withBirthDate(birthDate: string): PatientBuilder {
		this.#birthDate = birthDate;
		return this;
	}

	withStatus(status: string): PatientBuilder {
		if (status == PatientStatus.DISCHARGED) {
			this.#status = PatientStatus.DISCHARGED;
		}

		if (status == PatientStatus.HOSPITALIZED) {
			this.#status = PatientStatus.HOSPITALIZED;
		}

		return this;
	}

	withAlertStatus(status: boolean): PatientBuilder {
		this.#alertStatus = status;
		return this;
	}

	build(): Patient {
		const patient = new Patient(
			this.#systemId!,
			this.#patientId!,
			this.#name!,
			this.#breed!,
			this.#specie!,
			this.#birthDate!,
			this.#owner!,
		);

		if (this.#status) {
			patient.status = this.#status;
		}

		if (this.#alertStatus) {
			patient.hasAlert = this.#alertStatus!;
		}

		if (this.#hospitalizations) {
			patient.addHospitalizations(this.#hospitalizations!);
		}

		return patient;
	}
}
