export class AlertAlreadyCanceled extends Error {
	constructor() {
		super("O Alerta já foi cancelado");
	}
}
