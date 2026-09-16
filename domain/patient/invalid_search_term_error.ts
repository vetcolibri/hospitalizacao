export const SEARCH_TERM_MIN = 2;
export const SEARCH_TERM_MAX = 50;
/** Limite de resultados: a pesquisa nunca carrega a tabela toda. */
export const SEARCH_LIMIT = 10;

/**
 * Termo de pesquisa unificada inválido (vazio, demasiado curto ou longo).
 */
export class InvalidSearchTerm extends Error {
	constructor() {
		super(
			`O termo de pesquisa tem de ter entre ${SEARCH_TERM_MIN} e ${SEARCH_TERM_MAX} caracteres.`,
		);
	}
}
