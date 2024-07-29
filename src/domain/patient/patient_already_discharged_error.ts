import { DomainError } from "shared/domain_error.ts";

export class PatientAlreadyDischarged extends DomainError {
	constructor(name: string) {
		super(`Paciente ${name} já recebeu alta médica`);
	}
}
