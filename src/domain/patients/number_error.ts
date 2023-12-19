import { DomainError } from "shared/domain_error.ts";

export class InvalidNumber extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
