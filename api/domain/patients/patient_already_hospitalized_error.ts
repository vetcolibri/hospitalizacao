import { DomainError } from "../../shared/domian_error.ts";

export class PatientAlreadyHospitalized extends DomainError {
	constructor() {
		super("Paciente já está hospitalizado.");
	}
}
