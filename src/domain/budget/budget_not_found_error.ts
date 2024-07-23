import { DomainError } from "shared/domain_error.ts";

export class BudgetNotFound extends DomainError {
    constructor() {
        super("O Orçamento não foi encontrado.");
    }
}
