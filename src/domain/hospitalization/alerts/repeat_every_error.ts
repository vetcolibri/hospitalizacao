import { DomainError } from "shared/domain_error.ts";

export class InvalidRepeatEvery extends DomainError {
	constructor() {
		super(
			"A frequência de repetição do alerta não pode ser  menor que 1 segundo.",
		);
	}
}
