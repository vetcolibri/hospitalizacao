import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { InvalidRecentFilter } from "domain/hospitalization/invalid_recent_filter_error.ts";
import {
	isValidDateString,
	RECENT_LIMIT,
	RecentHospitalization,
	RecentHospitalizationsFilter,
} from "domain/hospitalization/recent_hospitalization.ts";
import { Either, left, right } from "shared/either.ts";

export class HospitalizationService {
	#hospitalizationRepository: HospitalizationRepository;

	constructor(hospitalizationRepository: HospitalizationRepository) {
		this.#hospitalizationRepository = hospitalizationRepository;
	}

	async findAllOpen(): Promise<Hospitalization[]> {
		return await this.#hospitalizationRepository.findByStatus(HospitalizationStatus.Open);
	}

	/**
	 * Últimos internamentos (máximo 20). Sem termo, lista os mais recentes de
	 * todo o histórico; com termo, filtra pelos quatro campos do paciente/tutor.
	 * `from`/`to` são inclusivos por data de entrada e combinam por AND.
	 */
	async findRecent(
		filters: RecentHospitalizationsFilter,
	): Promise<Either<InvalidRecentFilter, RecentHospitalization[]>> {
		const term = filters.term?.trim() ?? "";
		let normalizedTerm: string | undefined;

		if (term.length > 0) {
			if (term.length < 2 || term.length > 50) {
				return left(
					new InvalidRecentFilter(
						"O termo de pesquisa tem de ter entre 2 e 50 caracteres.",
					),
				);
			}

			normalizedTerm = term;
		}

		const from = filters.from?.trim() || undefined;
		const to = filters.to?.trim() || undefined;

		if (from && !isValidDateString(from)) {
			return left(new InvalidRecentFilter("Data inicial inválida (use YYYY-MM-DD)."));
		}

		if (to && !isValidDateString(to)) {
			return left(new InvalidRecentFilter("Data final inválida (use YYYY-MM-DD)."));
		}

		if (from && to && from > to) {
			return left(
				new InvalidRecentFilter("A data inicial não pode ser posterior à data final."),
			);
		}

		return right(
			await this.#hospitalizationRepository.findRecent(
				{ term: normalizedTerm, from, to },
				RECENT_LIMIT,
			),
		);
	}
}
