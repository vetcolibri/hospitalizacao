import { DomainError } from "../../shared/domian_error.ts";

export class DateInvalid extends DomainError {
	constructor(message: string) {
		super(message);
	}
}
