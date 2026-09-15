import { ID } from "shared/id.ts";

/**
 * RF-15 — diagnóstico do legado pendente, POR PACIENTE.
 *
 * As rondas e relatórios anteriores à migração continuam sem
 * `hospitalization_id` (NULL) por decisão de CLASSIFICAÇÃO MANUAL. Este porto
 * apenas CONTA esses registos do paciente pedido, para que o risco fique
 * explícito na própria ficha: nunca os atribui a um episódio nem assume que o
 * histórico legado está completo. Pendências de um paciente nunca aparecem no
 * diagnóstico de outro.
 */
export interface HospitalizationLinkStatus {
	reportsWithoutHospitalization: number;
	roundsWithoutHospitalization: number;
}

export interface HospitalizationLinkDiagnostic {
	statusForPatient(patientId: ID): Promise<HospitalizationLinkStatus>;
}
