import { DomainError } from "shared/domain_error.ts";

export class AlertNotFound extends DomainError {
	constructor() {
		super("Alerta não encontrado");
	}
}
