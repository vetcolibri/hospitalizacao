import { DomainError } from "shared/domain_error.ts";

export class OwnerNotFound extends DomainError {
  constructor() {
    super("O tutor não foi encontrado.");
  }
}
