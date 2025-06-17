import { IdValue } from "@shared/id_value.ts";
import { NotFoundError } from "@shared/not_found_error.ts";

export class FlowSheetRecordNotFoundError extends NotFoundError {
	constructor(cause: string, readonly id: IdValue) {
		super(`${cause}: O registro de medições com o id ${id.value} não foi encontrado`);
		this.name = "FlowSheetRecordNotFoundError";

		// Ensure the prototype chain is correctly set for instanceof checks
		Object.setPrototypeOf(this, FlowSheetRecordNotFoundError.prototype);
	}
}
