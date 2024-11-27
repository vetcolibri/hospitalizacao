export class BudgetNotFound extends Error {
    constructor() {
        super("O Orçamento não foi encontrado.");
    }
}
