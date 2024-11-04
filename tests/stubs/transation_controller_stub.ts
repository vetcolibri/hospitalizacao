import { TransactionController } from "shared/transaction_controller.ts";

export class TransationControllerStub implements TransactionController {
    begin(): Promise<void> {
        return Promise.resolve(undefined);
    }

    commit(): Promise<void> {
        return Promise.resolve(undefined);
    }

    rollback(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
