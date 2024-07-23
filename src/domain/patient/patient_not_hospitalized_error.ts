import { DomainError } from "shared/domain_error.ts";

export class PatientNotHospitalized extends DomainError {
    constructor() {
        super("O paciente não está hospitalizado.");
    }
}
