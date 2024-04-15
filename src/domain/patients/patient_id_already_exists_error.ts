import { DomainError } from "shared/domain_error.ts";

export class PatientIdAlreadyExists extends DomainError {
	constructor() {
		super("ID do paciente já foi registrado.");
	}
}
