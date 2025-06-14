import { IdValue } from "@shared/id_value.ts";
import { NotFoundError } from "@shared/not_found_error.ts";

export class HospitalizationNotFoundError extends NotFoundError {
	constructor(cause: string, readonly id: IdValue) {
		super(`${cause}: A hospitalização com o id ${id.value} não foi encontrada`);
		this.name = "HospitalizationNotFoundError";
		// this.cause = cause; // The 'cause' is now part of the message passed to super()

		// Ensure the prototype chain is correctly set for instanceof checks
		Object.setPrototypeOf(this, HospitalizationNotFoundError.prototype);
	}
}
