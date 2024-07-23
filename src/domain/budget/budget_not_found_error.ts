import { DomainError } from "shared/domain_error.ts";

export class BudgetNotFound extends DomainError {
    constructor() {
        super("O relatóro não foi encontrado.");
    }
}
