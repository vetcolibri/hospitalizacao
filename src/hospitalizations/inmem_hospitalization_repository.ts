import { IdValue } from "@shared/id_value.ts";
import { Hospitalization } from "./hospitalization.ts";
import { HospitalizationRepository } from "./hospitalization_repository.ts";
import { Either, left, right } from "@shared/either.ts";
import { HospitalizationNotFoundError } from "./hospitalization_not_found_error.ts";

const FIND_BY_ID_CAUSE = "InmemHospitalizationRepository:findById";
const FIND_ACTIVE_BY_PET_ID_CAUSE = "InmemHospitalizationRepository:findActiveByPetId";
const REMOVE_CAUSE = "InmemHospitalizationRepository:remove";

export class InmemHospitalizationRepository implements HospitalizationRepository {
	#hospitalizations: Map<string, Hospitalization>;

	constructor() {
		this.#hospitalizations = new Map();
	}

	exists(id: IdValue): Promise<boolean> {
		return Promise.resolve(this.#hospitalizations.has(id.value));
	}

	findById(id: IdValue): Promise<Either<HospitalizationNotFoundError, Hospitalization>> {
		const hospitalization = this.#hospitalizations.get(id.value);

		if (!hospitalization) {
			return Promise.resolve(left(new HospitalizationNotFoundError(FIND_BY_ID_CAUSE, id)));
		}

		return Promise.resolve(right(hospitalization));
	}

	findByPetId(petId: IdValue): Promise<Hospitalization[]> {
		const hospitalizations = Array.from(this.#hospitalizations.values())
			.filter((h) => h.petId.value === petId.value)
			.sort((a, b) => b.admissionDate.value.localeCompare(a.admissionDate.value)); // Most recent first

		return Promise.resolve(hospitalizations);
	}

	findActiveByPetId(
		petId: IdValue,
	): Promise<Either<HospitalizationNotFoundError, Hospitalization>> {
		const activeHospitalization = Array.from(this.#hospitalizations.values())
			.find((h) => h.petId.value === petId.value && h.isActive);

		if (!activeHospitalization) {
			return Promise.resolve(
				left(new HospitalizationNotFoundError(FIND_ACTIVE_BY_PET_ID_CAUSE, petId)),
			);
		}

		return Promise.resolve(right(activeHospitalization));
	}

	findActiveHospitalizations(): Promise<Hospitalization[]> {
		const activeHospitalizations = Array.from(this.#hospitalizations.values())
			.filter((h) => h.isActive)
			.sort((a, b) => a.admissionDate.value.localeCompare(b.admissionDate.value)); // Oldest first

		return Promise.resolve(activeHospitalizations);
	}

	save(hospitalization: Hospitalization): Promise<void> {
		this.#hospitalizations.set(hospitalization.id.value, hospitalization);
		return Promise.resolve();
	}

	update(hospitalization: Hospitalization): Promise<void> {
		this.#hospitalizations.set(hospitalization.id.value, hospitalization);
		return Promise.resolve();
	}

	remove(hospitalization: Hospitalization): Promise<Either<HospitalizationNotFoundError, void>> {
		if (!this.#hospitalizations.has(hospitalization.id.value)) {
			return Promise.resolve(
				left(new HospitalizationNotFoundError(REMOVE_CAUSE, hospitalization.id)),
			);
		}

		this.#hospitalizations.delete(hospitalization.id.value);
		return Promise.resolve(right(undefined));
	}
}
