import { DomainError } from "shared/domain_error.ts";

export class InvalidParameter extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
