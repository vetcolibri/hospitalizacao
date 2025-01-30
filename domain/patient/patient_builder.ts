import { Patient } from "domain/patient/patient.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export class PatientBuilder {
	#patientId?: string;
	#name?: string;
	#specie?: string;
	#breed?: string;
	#ownerId?: string;
	#birthDate?: string;

	withPatientId(patientId: string): PatientBuilder {
		this.#patientId = patientId;
		return this;
	}

	withName(name: string): PatientBuilder {
		this.#name = name;
		return this;
	}

	withSpecie(specie: string): PatientBuilder {
		this.#specie = specie;
		return this;
	}

	withBreed(breed: string): PatientBuilder {
		this.#breed = breed;
		return this;
	}

	withOwnerId(ownerId: string): PatientBuilder {
		this.#ownerId = ownerId;
		return this;
	}

	withBirthDate(birthDate: string): PatientBuilder {
		this.#birthDate = birthDate;
		return this;
	}

	build(): Either<Error, Patient> {
		if (!this.#patientId) return left(new Error("Patient ID is required"));

		if (!this.#name) return left(new Error("Patient name is required"));

		if (!this.#specie) return left(new Error("Patient specie is required"));

		if (!this.#breed) return left(new Error("Patient breed is required"));

		if (!this.#ownerId) return left(new Error("Patient owner is required"));

		if (!this.#birthDate) return left(new Error("Patient birth date is required"));

		const patient = new Patient(
			ID.random(),
			this.#patientId,
			this.#name,
			this.#specie,
			this.#breed,
			this.#birthDate,
			this.#ownerId,
		);

		return right(patient);
	}
}
