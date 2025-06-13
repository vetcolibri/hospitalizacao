import { IdValue } from "@shared/id_value.ts";

export class HospitalizationNotFoundError extends Error {
	constructor(cause: string, readonly id: IdValue) {
		super(`${cause}: A hospitalização com o id ${id.value} não foi encontrada`);
		this.name = "HospitalizationNotFoundError";
		this.cause = cause;
	}
}
