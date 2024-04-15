import { Hospitalization } from "../../domain/patients/hospitalizations/hospitalization.ts";
import { HospitalizationRepository } from "../../domain/patients/hospitalizations/hospitalization_repository.ts";
import { ID } from "../../shared/id.ts";

export class InmemHospitalizationRepository implements HospitalizationRepository {
	#data: Record<string, Hospitalization> = {};

	getAllOpened(): Promise<Hospitalization[]> {
		const result = this.records.filter((h) => h.isOpen());
		return Promise.resolve(result);
	}

	open(patientId: ID): Promise<Hospitalization> {
		const hospitalization = this.records.find((h) =>
			h.patientId.equals(patientId) && h.isOpen()
		)!;
		return Promise.resolve(hospitalization);
	}

	save(hospitalization: Hospitalization): Promise<void> {
		this.#data[hospitalization.hospitalizationId.value] = hospitalization;
		return Promise.resolve();
	}

	last(): Promise<Hospitalization> {
		const hospitalization = this.records[this.records.length - 1];
		return Promise.resolve(hospitalization);
	}

	get records(): Hospitalization[] {
		return Object.values(this.#data);
	}
}
