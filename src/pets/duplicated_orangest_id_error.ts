import { OrangestIdValue } from "@shared/orangest_id_value.ts";

export class DuplicatedOrangestIdError extends Error {
	constructor(cause: string, readonly id: OrangestIdValue) {
		super(`${cause}: O ID Orangest [${id.value}] já está a ser utilizado por outro registo`);
		this.name = "DuplicatedOrangestIdError";
		this.cause = cause;
	}
}
