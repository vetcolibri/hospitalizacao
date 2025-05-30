import { DateValue } from "@shared/date_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { ValidationError } from "@shared/validation_error.ts";

import DOG_BREEDS from "./dog_breeds.json" with { type: "json" };
import CAT_BREEDS from "./cat_breeds.json" with { type: "json" };
import BIRD_BREEDS from "./bird_breeds.json" with { type: "json" };
import EXOTIC_BREEDS from "./bird_breeds.json" with { type: "json" };

export class Pet {
	readonly #id: IdValue;
	#orangestId: OrangestIdValue;
	#ownerId: IdValue;
	#name: string;
	#birthday: DateValue;
	readonly #species: "CANINO" | "FELINO" | "AVES" | "EXÓTICO";
	#breeds: string[];
	#weight: number;

	private constructor(
		id: IdValue,
		orangestId: OrangestIdValue,
		ownerId: IdValue,
		name: string,
		birthday: DateValue,
		species: "CANINO" | "FELINO" | "AVES" | "EXÓTICO",
		breeds: string[],
		weight: number,
	) {
		this.#id = id;
		this.#name = name;
		this.#birthday = birthday;
		this.#species = species;
		this.#breeds = breeds;
		this.#ownerId = ownerId;
		this.#orangestId = orangestId;
		this.#weight = weight;

		const errs: string[] = [];

		if (!id) {
			errs.push("O pet deve ter um id");
		}

		if (!orangestId) {
			errs.push("O pet deve ter um orangestId");
		}

		if (!ownerId) {
			errs.push("O pet deve ter um ownerId");
		}

		if (name.trim().length < 2) {
			errs.push("O nome do pet deve ter pelo menos 2 caracteres");
		}

		if (!birthday.earlierThan(DateValue.today())) {
			errs.push("A data de nascimento do pet deve ser anterior a hoje");
		}

		if (breeds.length === 0) {
			errs.push("O pet deve ter pelo menos uma raça");
		}

		if (weight <= 0) {
			errs.push("O peso do pet deve ser maior que zero");
		}

		if (errs.length > 0) {
			throw new ValidationError("Pet", errs);
		}

		if (species === "CANINO" && !breeds.every((b) => DOG_BREEDS.includes(b))) {
			console.warn(`[WARNING] Raça inválida para espécie CANINO: ${breeds.join(", ")}`);
		}

		if (species === "FELINO" && !breeds.every((b) => CAT_BREEDS.includes(b))) {
			console.warn(`[WARNING] Raça inválida para espécie FELINO: ${breeds}`);
		}

		if (species === "AVES" && !breeds.every((b) => BIRD_BREEDS.includes(b))) {
			console.warn(`[WARNING] Raça inválida para espécie AVES: ${breeds}`);
		}

		if (species === "EXÓTICO" && !breeds.every((b) => EXOTIC_BREEDS.includes(b))) {
			console.warn(`[WARNING] Raça inválida para espécie EXÓTICO: ${breeds}`);
		}
	}

	static Builder = class {
		private id: IdValue;
		private name: string;
		private birthday: DateValue;
		private species: "CANINO" | "FELINO" | "AVES" | "EXÓTICO";
		private breeds: string[];
		private ownerId: IdValue;
		private orangestId: IdValue;
		private weight: number;

		constructor() {
			this.id = IdValue.random();
			this.birthday = undefined as unknown as DateValue;
			this.breeds = [];
			this.name = undefined as unknown as string;
			this.species = undefined as unknown as "CANINO" | "FELINO" | "AVES" | "EXÓTICO";
			this.ownerId = undefined as unknown as IdValue;
			this.orangestId = undefined as unknown as IdValue;
			this.weight = 0;
		}

		withName(name: string) {
			this.name = name;
			return this;
		}

		withBirthday(birthday: DateValue) {
			this.birthday = birthday;
			return this;
		}

		withSpecies(species: "CANINO" | "FELINO" | "AVES" | "EXÓTICO") {
			this.species = species;
			return this;
		}

		withBreeds(breeds: string[]) {
			this.breeds = breeds;
			return this;
		}

		withOwnerId(ownerId: IdValue) {
			this.ownerId = ownerId;
			return this;
		}

		withOrangestId(orangestId: IdValue) {
			this.orangestId = orangestId;
			return this;
		}

		withWeight(weight: number) {
			this.weight = weight;
			return this;
		}

		build(): Pet {
			return new Pet(
				this.id,
				this.orangestId,
				this.ownerId,
				this.name,
				this.birthday,
				this.species,
				this.breeds,
				this.weight,
			);
		}
	};
}
