import { DomainError } from "../../shared/domian_error.ts";

export class InvalidDate extends DomainError {
	constructor(message: string) {
		super(message);
	}
}
