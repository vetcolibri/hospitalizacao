import { DomainError } from "../../shared/domian_error.ts";

export class InvalidParameter extends DomainError {
	constructor(message: string) {
		super(message);
	}
}
