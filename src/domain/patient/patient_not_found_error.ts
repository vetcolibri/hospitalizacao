import { DomainError } from "shared/domain_error.ts";

export class PatientNotFound extends DomainError {
  constructor() {
    super("O paciente não foi encontrado.");
  }
}
