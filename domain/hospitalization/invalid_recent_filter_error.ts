/**
 * Filtros da listagem de últimos internamentos inválidos (termo fora de 2–50
 * caracteres, datas que não são `YYYY-MM-DD`, ou `from` posterior a `to`).
 */
export class InvalidRecentFilter extends Error {
	constructor(message = "Filtros inválidos.") {
		super(message);
	}
}
