import { Hospitalization } from "domain/patients/hospitalizations/hospitalization.ts";
import { HospitalizationRepository } from "domain/patients/hospitalizations/hospitalization_repository.ts";

export class HospitalizationService {
	#hospitalizationRepository: HospitalizationRepository;

	constructor(hospitalizationRepository: HospitalizationRepository) {
		this.#hospitalizationRepository = hospitalizationRepository;
	}

	async getAllOpened(): Promise<Hospitalization[]> {
		return await this.#hospitalizationRepository.getAllOpened();
	}
}
