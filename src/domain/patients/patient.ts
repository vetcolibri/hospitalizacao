import { BirthDate } from "./birth_date.ts";
import { ID } from "shared/id.ts";

export enum PatientStatus {
	Hospitalized = "HOSPITALIZADO",
	Discharged = "ALTA MEDICA",
}

export enum Specie {
	Canine = "CANINO",
	Feline = "FELINO",
	Exotic = "EXÓTICO",
	ExoticMockey = "EXÓTICO - MACACO",
	ExoticReptile = "EXÓTICO - RÉPTIL",
	ExoticParrot = "EXÓTICO - PAPAGAIO",
	Bird = "AVES",
}

type Options = {
	systemId: string;
	patientId: string;
	name: string;
	specie: string;
	breed: string;
	birthDate: string;
	ownerId: string;
	status: string;
};

export class Patient {
	#systemId: ID;
	#patientId: ID;
	#name: string;
	#specie: string;
	#breed: string;
	#birthDate: BirthDate;
	#ownerId: ID;
	#status: PatientStatus;

	constructor(
		systemId: ID,
		patientId: string,
		name: string,
		specie: string,
		breed: string,
		birthDate: string,
		ownerId: string,
	) {
		this.#systemId = systemId;
		this.#patientId = ID.fromString(patientId);
		this.#name = name;
		this.#specie = specie;
		this.#breed = breed;
		this.#birthDate = new BirthDate(birthDate);
		this.#ownerId = ID.fromString(ownerId);
		this.#status = PatientStatus.Hospitalized;
	}

	static restore(data: Options) {
		const patient = new Patient(
			ID.fromString(data.systemId),
			data.patientId,
			data.name,
			data.specie,
			data.breed,
			data.birthDate,
			data.ownerId,
		);

		patient.updateStatus(data.status);

		return patient;
	}

	hospitalize() {
		if (this.isHospitalized()) return;
		this.#status = PatientStatus.Hospitalized;
	}

	discharge() {
		if (!this.isHospitalized()) return;
		this.#status = PatientStatus.Discharged;
	}

	isHospitalized() {
		return this.#status === PatientStatus.Hospitalized;
	}

	private updateStatus(status: string) {
		if (status === PatientStatus.Hospitalized) {
			this.#status = PatientStatus.Hospitalized;
			return;
		}

		this.#status = PatientStatus.Discharged;
	}

	get systemId() {
		return this.#systemId;
	}

	get patientId() {
		return this.#patientId;
	}

	get name() {
		return this.#name;
	}

	get specie() {
		return this.#specie;
	}

	get breed() {
		return this.#breed;
	}

	get birthDate() {
		return this.#birthDate;
	}

	get ownerId() {
		return this.#ownerId;
	}

	get status() {
		return this.#status;
	}
}
