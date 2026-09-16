import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import {
	RecentHospitalization,
	RecentHospitalizationsFilter,
} from "domain/hospitalization/recent_hospitalization.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface HospitalizationRepository {
	findByPatientId(patientId: ID): Promise<Either<HospitalizationNotFound, Hospitalization>>;
	/**
	 * Todas as hospitalizações abertas do doente. Devolve a lista completa para
	 * que o chamador possa detectar ambiguidade em vez de escolher um episódio.
	 */
	findOpenByPatientId(patientId: ID): Promise<Hospitalization[]>;
	/**
	 * Histórico completo do doente (abertos e encerrados), ordenado por
	 * `entry_date DESC, hospitalization_id DESC`.
	 */
	findAllByPatientId(patientId: ID): Promise<Hospitalization[]>;
	/**
	 * Episódio pelo seu identificador, em qualquer estado. A verificação de que
	 * pertence ao doente pedido é feita por quem chama (RF-15).
	 */
	findByHospitalizationId(
		id: ID,
	): Promise<Either<HospitalizationNotFound, Hospitalization>>;
	/**
	 * Últimos internamentos (até `limit`), ordenados por entrada descendente e
	 * com termo unificado opcional (literal, case-insensitive) e intervalo de
	 * datas inclusivo por `entry_date`. Uma única leitura, sem N+1.
	 */
	findRecent(
		filter: RecentHospitalizationsFilter,
		limit: number,
	): Promise<RecentHospitalization[]>;
	findByStatus(status: HospitalizationStatus): Promise<Hospitalization[]>;
	save(hospitalization: Hospitalization): Promise<void>;
	update(hospitalization: Hospitalization): Promise<void>;
	last(): Promise<Hospitalization>;
}
