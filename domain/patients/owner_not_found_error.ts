import { DomainError } from "../../shared/domian_error.ts";

export class OwnerNotFound extends DomainError {
	constructor() {
		super("O dono não foi encontrado.");
	}
}
