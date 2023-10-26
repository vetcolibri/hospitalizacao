import { DomainError } from "../../shared/domian_error.ts";

export class AlertNotFound extends DomainError {
	constructor() {
		super("Alert not found");
	}
}
