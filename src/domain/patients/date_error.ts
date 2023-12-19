import { DomainError } from "shared/domain_error.ts";

export class InvalidDate extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
