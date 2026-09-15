/**
 * RF-15 — diagnóstico do legado pendente.
 *
 * As rondas e relatórios anteriores à migração continuam sem
 * `hospitalization_id` (NULL) por decisão de CLASSIFICAÇÃO MANUAL. Este porto
 * apenas CONTA esses registos, para que o risco fique explícito: nunca os
 * atribui a um episódio nem assume que o histórico legado está completo.
 */
export interface HospitalizationLinkStatus {
	reportsWithoutHospitalization: number;
	roundsWithoutHospitalization: number;
}

export interface HospitalizationLinkDiagnostic {
	status(): Promise<HospitalizationLinkStatus>;
}
