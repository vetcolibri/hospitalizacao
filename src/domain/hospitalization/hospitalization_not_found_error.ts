import { DomainError } from "shared/domain_error.ts";

export class HospitalizationNotFound extends DomainError {
	constructor() {
		super("Hospitalização não encontrada");
	}
}
