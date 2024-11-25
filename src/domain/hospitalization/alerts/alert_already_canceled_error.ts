import { DomainError } from "shared/domain_error.ts";

export class AlertAlreadyCanceled extends DomainError {
	constructor() {
		super("O Alerta já foi cancelado");
	}
}
