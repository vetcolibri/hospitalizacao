/**
 * Validador do mapping manual do legado (RF-15/RF-16).
 *
 * Função pura: recebe o mapping e os factos lidos da base de dados (registos
 * legados ainda por associar + hospitalizações candidatas) e devolve a lista de
 * problemas. Não escreve nada nem adivinha associações.
 *
 * Só o que é estritamente necessário para decidir é comparado:
 * identificadores, `system_id` e timestamps. Nunca nomes, telefones,
 * comentários ou conteúdo clínico.
 */

export const MAPPING_VERSION = 1;

/** ISO-8601 com data, hora e fuso explícito (ex.: 2026-09-15T11:00:00.000Z). */
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export type RecordType = "round" | "report";

export interface LegacyRecordFact {
	record_type: RecordType;
	record_id: string;
	system_id: string;
	/** Ronda: medição mais antiga. Relatório: `created_at`. ISO-8601. */
	starts_at: string;
	/** Ronda: medição mais recente. Relatório: igual a `starts_at`. ISO-8601. */
	ends_at: string;
}

export interface HospitalizationFact {
	hospitalization_id: string;
	system_id: string;
	entry_date: string;
	/** `null` significa episódio aberto (fim = instante da validação). */
	discharge_date: string | null;
}

export interface MappingEntry {
	record_type: RecordType;
	record_id: string;
	system_id: string;
	hospitalization_id: string;
	/** Obrigatório apenas quando o intervalo é temporalmente impossível. */
	override_reason?: string | null;
}

export interface LegacyMapping {
	version: number;
	approved: boolean;
	reviewed_by?: string;
	reviewed_at?: string;
	entries: MappingEntry[];
}

export interface ValidationIssue {
	code: string;
	record_type?: string;
	record_id?: string;
	message: string;
}

export interface ValidationOptions {
	asOf: Date;
	/** Na aplicação exige-se `approved: true`; no rascunho não. */
	requireApproved?: boolean;
}

function issue(code: string, message: string, entry?: Partial<MappingEntry>): ValidationIssue {
	return {
		code,
		record_type: entry?.record_type,
		record_id: entry?.record_id,
		message,
	};
}

function key(recordType: string, recordId: string): string {
	return `${recordType}:${recordId}`;
}

function isNonEmpty(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

/**
 * Intervalo do registo contido no intervalo do episódio?
 * Episódio aberto termina em `asOf`.
 */
function isTemporallyPossible(
	record: LegacyRecordFact,
	hospitalization: HospitalizationFact,
	asOf: Date,
): boolean | undefined {
	const start = new Date(record.starts_at).getTime();
	const end = new Date(record.ends_at).getTime();
	const entry = new Date(hospitalization.entry_date).getTime();
	const discharge = hospitalization.discharge_date
		? new Date(hospitalization.discharge_date).getTime()
		: asOf.getTime();

	if ([start, end, entry, discharge].some((value) => Number.isNaN(value))) return undefined;

	return start >= entry && end <= discharge;
}

/**
 * Episódios do MESMO paciente cujo intervalo contém o registo (candidatos
 * exactos). Usado só para ajudar a revisão humana; não decide nada sozinho.
 */
export function candidateHospitalizations(
	record: LegacyRecordFact,
	hospitalizations: HospitalizationFact[],
	asOf: Date,
): HospitalizationFact[] {
	return hospitalizations.filter((hospitalization) =>
		hospitalization.system_id === record.system_id &&
		isTemporallyPossible(record, hospitalization, asOf) === true
	);
}

export function validateMapping(
	mapping: LegacyMapping,
	records: LegacyRecordFact[],
	hospitalizations: HospitalizationFact[],
	options: ValidationOptions,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (mapping?.version !== MAPPING_VERSION) {
		issues.push(issue(
			"MAPPING_VERSION_MISMATCH",
			`Versão de mapping inválida (esperada ${MAPPING_VERSION}).`,
		));
	}

	if (options.requireApproved && mapping?.approved !== true) {
		issues.push(issue("MAPPING_NOT_APPROVED", "O mapping não está aprovado para aplicação."));
	}

	// Um mapping aprovado tem de identificar quem aprovou e quando. Não é uma
	// assinatura criptográfica: é a aprovação identificada da equipa (CVL).
	if (options.requireApproved === true || mapping?.approved === true) {
		if (!isNonEmpty(mapping?.reviewed_by)) {
			issues.push(issue("REVIEWED_BY_MISSING", "Falta o reviewer que aprovou o mapping."));
		}

		const reviewedAt = mapping?.reviewed_at;
		const isIso = typeof reviewedAt === "string" && ISO_DATETIME.test(reviewedAt);
		const parsed = isIso ? Date.parse(reviewedAt as string) : Number.NaN;

		if (!isIso || Number.isNaN(parsed)) {
			issues.push(issue(
				"REVIEWED_AT_INVALID",
				"A data de revisão tem de ser ISO-8601 com fuso explícito.",
			));
		} else if (parsed > options.asOf.getTime()) {
			issues.push(issue("REVIEWED_AT_FUTURE", "A data de revisão não pode estar no futuro."));
		}
	}

	if (!Array.isArray(mapping?.entries)) {
		issues.push(issue("MAPPING_ENTRIES_INVALID", "O mapping não tem uma lista de entradas."));
		return issues;
	}

	const recordIndex = new Map<string, LegacyRecordFact>();
	for (const record of records) {
		recordIndex.set(key(record.record_type, record.record_id), record);
	}

	const hospitalizationIndex = new Map<string, HospitalizationFact>();
	for (const hospitalization of hospitalizations) {
		hospitalizationIndex.set(hospitalization.hospitalization_id, hospitalization);
	}

	const seen = new Set<string>();
	const covered = new Set<string>();

	for (const entry of mapping.entries) {
		if (
			!isNonEmpty(entry?.record_type) ||
			!isNonEmpty(entry?.record_id) ||
			!isNonEmpty(entry?.system_id) ||
			!isNonEmpty(entry?.hospitalization_id)
		) {
			issues.push(issue("MISSING_FIELD", "Entrada com campos obrigatórios em falta.", entry));
			continue;
		}

		if (entry.record_type !== "round" && entry.record_type !== "report") {
			issues.push(issue(
				"INVALID_RECORD_TYPE",
				`Tipo de registo inválido: ${entry.record_type}.`,
				entry,
			));
			continue;
		}

		const recordKey = key(entry.record_type, entry.record_id);

		if (seen.has(recordKey)) {
			issues.push(issue("DUPLICATE_RECORD", "Registo duplicado no mapping.", entry));
			continue;
		}
		seen.add(recordKey);
		covered.add(recordKey);

		const record = recordIndex.get(recordKey);
		if (!record) {
			issues.push(issue(
				"RECORD_NOT_FOUND",
				"Registo legado inexistente ou já classificado.",
				entry,
			));
			continue;
		}

		if (record.system_id !== entry.system_id) {
			issues.push(issue(
				"PATIENT_MISMATCH",
				"O system_id do mapping não corresponde ao do registo.",
				entry,
			));
		}

		const hospitalization = hospitalizationIndex.get(entry.hospitalization_id);
		if (!hospitalization) {
			issues.push(issue("HOSPITALIZATION_NOT_FOUND", "Hospitalização inexistente.", entry));
			continue;
		}

		if (hospitalization.system_id !== entry.system_id) {
			issues.push(issue(
				"HOSPITALIZATION_PATIENT_MISMATCH",
				"A hospitalização pertence a outro paciente.",
				entry,
			));
			continue;
		}

		const possible = isTemporallyPossible(record, hospitalization, options.asOf);
		if (possible === undefined) {
			issues.push(issue("INVALID_DATE", "Datas inválidas no registo ou na hospitalização.", entry));
			continue;
		}

		if (!possible && !isNonEmpty(entry.override_reason)) {
			issues.push(issue(
				"TEMPORALLY_IMPOSSIBLE",
				"O registo está fora do intervalo do episódio; exige override justificado.",
				entry,
			));
		}
	}

	for (const record of records) {
		if (!covered.has(key(record.record_type, record.record_id))) {
			issues.push(issue(
				"MAPPING_INCOMPLETE",
				"Registo legado sem entrada no mapping.",
				{ record_type: record.record_type, record_id: record.record_id },
			));
		}
	}

	return issues;
}
