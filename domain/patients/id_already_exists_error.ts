import { DomainError } from "../../shared/domian_error.ts";

export class IDAlreadyExists extends DomainError {
	constructor() {
		super("ID do paciente já foi registrado.");
	}
}
