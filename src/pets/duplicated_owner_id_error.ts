import { IdValue } from "@shared/id_value.ts";

export class DuplicatedOwnerIdError extends Error {
	constructor(cause: string, readonly id: IdValue) {
		super(`${cause}: O ID [${id.value}] já está a ser utilizado por outro tutor`);
		this.name = "DuplicatedOwnerIdError";
		this.cause = cause;
	}
}
