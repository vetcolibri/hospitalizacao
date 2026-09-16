import { Patient } from "domain/patient/patient.ts";

/**
 * Resultado da pesquisa unificada: o paciente e o nome do tutor. Não transporta
 * telefone, WhatsApp nem qualquer outro dado sensível.
 */
export interface PatientSearchResult {
	patient: Patient;
	ownerName: string;
}
