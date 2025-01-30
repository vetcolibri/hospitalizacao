import { Either, left, right } from "shared/either.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { ID } from "shared/id.ts";

export class InmemHospitalizationRepository implements HospitalizationRepository {
	#data: Record<string, Hospitalization> = {};

	constructor(hospitalizations?: Hospitalization[]) {
		if (!hospitalizations) return;

		hospitalizations.forEach((h) => (this.#data[h.hospitalizationId.value] = h));
	}

	findByStatus(status: HospitalizationStatus): Promise<Hospitalization[]> {
		return Promise.resolve(this.records.filter((h) => h.status = status));
	}

	findByPatientId(patientId: ID): Promise<Either<HospitalizationNotFound, Hospitalization>> {
		const hospitalization = this.records.find((h) =>
			h.patientId.equals(patientId) && h.isOpen()
		);

		if (!hospitalization) return Promise.resolve(left(new HospitalizationNotFound()));

		return Promise.resolve(right(hospitalization));
	}

	save(hospitalization: Hospitalization): Promise<void> {
		this.#data[hospitalization.hospitalizationId.value] = hospitalization;
		return Promise.resolve(undefined);
	}

	update(hospitalization: Hospitalization): Promise<void> {
		this.#data[hospitalization.hospitalizationId.value] = hospitalization;
		return Promise.resolve(undefined);
	}

	last(): Promise<Hospitalization> {
		const hospitalization = this.records[this.records.length - 1];
		return Promise.resolve(hospitalization);
	}

	get records(): Hospitalization[] {
		return Object.values(this.#data);
	}
}
