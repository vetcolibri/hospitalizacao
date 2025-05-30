import { IdValue } from "@shared/id_value.ts";

export class OwnerNotFoundError extends Error {
	constructor(cause: string, readonly id: IdValue) {
		super(`${cause}: O tutor com o id ${id.value} não foi encontrado`);
		this.name = "OwnerNotFoundError";
		this.cause = cause;
	}
}
