import { DomainError } from "../../shared/domian_error.ts";

export class PatientNotFound extends DomainError {
	constructor() {
		super("Patient not found");
	}
}
