import { DomainError } from "../../shared/domian_error.ts";

export class PatientAlreadyHospitalized extends DomainError {
	constructor(name: string) {
		super(`Paciente ${name} está hospitalizado`);
	}
}
