import { HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";

/** Limite fixo da listagem de últimos internamentos (nunca carrega a tabela toda). */
export const RECENT_LIMIT = 20;

/** Termo unificado e intervalo de datas (opcionais) da listagem. */
export interface RecentHospitalizationsFilter {
	/** Já trimado pelo serviço; `undefined` quando não há filtro por paciente. */
	term?: string;
	/** YYYY-MM-DD, inclusivo por data de entrada. */
	from?: string;
	/** YYYY-MM-DD, inclusivo por data de entrada. */
	to?: string;
}

/** Linha da listagem: episódio + identificação do paciente e do tutor. */
export interface RecentHospitalization {
	hospitalizationId: string;
	/** system_id interno, necessário para abrir o episódio read-only. */
	systemId: string;
	entryDate: Date;
	dischargeDate?: Date;
	status: HospitalizationStatus;
	patientId: string;
	patientName: string;
	ownerId: string;
	ownerName: string;
}

/** Valida uma data `YYYY-MM-DD` real (rejeita 2026-02-30, 2026-13-01, etc.). */
export function isValidDateString(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day;
}
