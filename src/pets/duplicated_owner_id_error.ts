import { IdValue } from "@shared/id_value.ts";
import { ValidationError } from "@shared/validation_error.ts";

export class DuplicatedOwnerIdError extends ValidationError {
  constructor(readonly id: IdValue) {
    const fieldName = "ownerId"; // Or a more generic field name if appropriate
    const errorMessage =
      `O ID [${id.value}] já está a ser utilizado por outro tutor`;
    super(fieldName, [errorMessage]);
    this.name = "DuplicatedOwnerIdError";

    // Ensure the prototype chain is correctly set for instanceof checks
    Object.setPrototypeOf(this, DuplicatedOwnerIdError.prototype);
  }
}
