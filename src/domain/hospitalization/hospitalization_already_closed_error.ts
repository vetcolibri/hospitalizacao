import { DomainError } from "shared/domain_error.ts";

export class HospitalizationAlreadyClosed extends DomainError {
	constructor() {
		super("Hospitalization is already closed");
	}
}
