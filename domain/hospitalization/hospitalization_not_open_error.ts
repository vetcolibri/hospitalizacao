/**
 * RF-16 — um episódio encerrado é apenas de leitura. Qualquer edição clínica
 * (por exemplo as datas do orçamento) tem de ser recusada com este erro.
 */
export class HospitalizationNotOpen extends Error {
	constructor() {
		super("A hospitalização já foi encerrada. O episódio é apenas de leitura.");
	}
}
