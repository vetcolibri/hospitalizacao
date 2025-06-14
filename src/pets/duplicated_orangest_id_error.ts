import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { ValidationError } from "@shared/validation_error.ts";

export class DuplicatedOrangestIdError extends ValidationError {
	constructor(readonly id: OrangestIdValue) {
		const fieldName = "orangestId";
		const errorMessage = `O ID Orangest [${id.value}] já está a ser utilizado por outro registo`;
		super(fieldName, [errorMessage]);
		this.name = "DuplicatedOrangestIdError";

		// Ensure the prototype chain is correctly set for instanceof checks
		Object.setPrototypeOf(this, DuplicatedOrangestIdError.prototype);
	}
}
