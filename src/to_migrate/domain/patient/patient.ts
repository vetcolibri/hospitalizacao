import { BirthDate } from "@domain/patient/birth_date.ts";
import { ID } from "@shared/id.ts";
import { Either, left, right } from "@shared/either.ts";

export enum PatientStatus {
	Hospitalized = "HOSPITALIZADO",
	Discharged = "ALTA MEDICA",
	DischargedWithUnpaidBudget = "ALTA MEDICA COM ORÇAMENTO NÃO PAGO",
	DischargedWithPendingBudget = "ALTA MEDICA COM ORÇAMENTO PENDENTE",
	DischargedWithBudgetSent = "ALTA MEDICA COM ORÇAMENTO ENVIADO",
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

export class Patient {
	#systemId: ID;
	#patientId: ID;
	#name: string;
	#specie: string;
	#breed: string;
	#birthDate: BirthDate;
	#ownerId: ID;
	#status: PatientStatus;

	private constructor(
		systemId: ID,
		patientId: ID,
		name: string,
		specie: string,
		breed: string,
		birthDate: BirthDate,
		ownerId: ID,
		status: PatientStatus = PatientStatus.Hospitalized,
	) {
		this.#systemId = systemId;
		this.#patientId = patientId;
		this.#name = name;
		this.#specie = specie;
		this.#breed = breed;
		this.#birthDate = birthDate;
		this.#ownerId = ownerId;
		this.#status = status;

		this.#validate();
	}

	#validate() {
		if (!this.#patientId) throw new Error("Patient ID is required");
		if (!this.#name) throw new Error("Patient name is required");
		if (!this.#specie) throw new Error("Patient specie is required");
		if (!this.#breed) throw new Error("Patient breed is required");
		if (!this.#ownerId) throw new Error("Patient owner is required");
		if (!this.#birthDate) throw new Error("Patient birth date is required");
		if (!this.#status) throw new Error("Patient status is required");
	}

	hospitalize() {
		if (this.isHospitalized()) return;
		this.#status = PatientStatus.Hospitalized;
	}

	discharge() {
		this.#status = PatientStatus.Discharged;
	}

	dischargeWithUnpaidBudget() {
		this.#status = PatientStatus.DischargedWithUnpaidBudget;
	}

	dischargeWithPendingBudget() {
		this.#status = PatientStatus.DischargedWithPendingBudget;
	}

	dischargeWithBudgetSent() {
		this.#status = PatientStatus.DischargedWithBudgetSent;
	}

	isHospitalized() {
		return this.#status === PatientStatus.Hospitalized;
	}

	hasBeenDischarged() {
		if (this.status === PatientStatus.DischargedWithUnpaidBudget) return true;

		if (this.status === PatientStatus.DischargedWithPendingBudget) return true;

		if (this.status === PatientStatus.DischargedWithBudgetSent) return true;

		if (this.status === PatientStatus.Discharged) return true;

		return false;
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

	changeOwner(ownerId: ID) {
		this.#ownerId = ownerId;
	}

	static builder() {
		return new Patient.Builder();
	}

	private static Builder = class {
		#patientId?: ID;
		#name?: string;
		#specie?: string;
		#breed?: string;
		#ownerId?: ID;
		#birthDate?: BirthDate;
		#status = PatientStatus.Hospitalized;
		#systemId = ID.random();

		withPatientId(patientId: ID) {
			this.#patientId = patientId;
			return this;
		}

		withSystemId(systemId: ID) {
			this.#systemId = systemId;
			return this;
		}

		withName(name: string) {
			this.#name = name;
			return this;
		}

		withSpecie(specie: string) {
			this.#specie = specie;
			return this;
		}

		withBreed(breed: string) {
			this.#breed = breed;
			return this;
		}

		withOwnerId(ownerId: ID) {
			this.#ownerId = ownerId;
			return this;
		}

		withBirthDate(birthDate: BirthDate) {
			this.#birthDate = birthDate;
			return this;
		}

		withStatus(status: PatientStatus) {
			this.#status = status;
			return this;
		}

		build(): Either<Error, Patient> {
			try {
				const patient = new Patient(
					this.#systemId!,
					this.#patientId!,
					this.#name!,
					this.#specie!,
					this.#breed!,
					this.#birthDate!,
					this.#ownerId!,
					this.#status,
				);
				return right(patient);
			} catch (error) {
				return left(error as Error);
			}
		}
	};
}
