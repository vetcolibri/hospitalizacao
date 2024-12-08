import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";

export class HospitalizationService {
	#hospitalizationRepository: HospitalizationRepository;

	constructor(hospitalizationRepository: HospitalizationRepository) {
		this.#hospitalizationRepository = hospitalizationRepository;
	}

	async findAll(): Promise<Hospitalization[]> {
		return await this.#hospitalizationRepository.findAll();
	}
}
