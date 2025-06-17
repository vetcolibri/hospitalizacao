import { IdValue } from "@shared/id_value.ts";
import { NotFoundError } from "@shared/not_found_error.ts";

export class IntakeOutputNotFoundError extends NotFoundError {
	constructor(cause: string, readonly id: IdValue) {
		super(`${cause}: O controle de entrada/saída com o id ${id.value} não foi encontrado`);
		this.name = "IntakeOutputNotFoundError";

		// Ensure the prototype chain is correctly set for instanceof checks
		Object.setPrototypeOf(this, IntakeOutputNotFoundError.prototype);
	}
}
