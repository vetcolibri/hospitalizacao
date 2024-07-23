import { DomainError } from "shared/domain_error.ts";

export class ReportNotFound extends DomainError {
    constructor() {
        super("O relatóro não foi encontrado.");
    }
}
