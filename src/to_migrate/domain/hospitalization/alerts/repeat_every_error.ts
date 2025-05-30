export class InvalidRepeatEvery extends Error {
	constructor() {
		super(
			"A frequência de repetição do alerta não pode ser  menor que 1 segundo.",
		);
	}
}
