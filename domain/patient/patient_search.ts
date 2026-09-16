/**
 * Relevância da pesquisa unificada. O termo chega já em minúsculas.
 * exacto (3) > prefixo (2) > ocorrência parcial (1) > sem correspondência (0).
 */
export const MATCH_EXACT = 3;
export const MATCH_PREFIX = 2;
export const MATCH_PARTIAL = 1;
export const MATCH_NONE = 0;

/**
 * Calcula a relevância de um campo. Correspondência literal: `%` e `_` são
 * caracteres normais, nunca wildcards.
 */
export function matchScore(value: string, termLower: string): number {
	if (!termLower) return MATCH_NONE;

	const normalized = value.toLowerCase();

	if (normalized === termLower) return MATCH_EXACT;
	if (normalized.startsWith(termLower)) return MATCH_PREFIX;
	if (normalized.includes(termLower)) return MATCH_PARTIAL;

	return MATCH_NONE;
}
