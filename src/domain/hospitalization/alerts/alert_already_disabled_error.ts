import { DomainError } from "shared/domain_error.ts";

export class AlertAlreadyDisabled extends DomainError {
	constructor() {
		super("Alert already disabled");
	}
}
