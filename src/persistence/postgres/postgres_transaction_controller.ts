import { Client } from "deps";
import { TransactionController } from "shared/transaction_controller.ts";

export class PostgresTransationController implements TransactionController {
    constructor(private client: Client) {}

    async begin(): Promise<void> {
        await this.client.queryArray("BEGIN");
    }

    async commit(): Promise<void> {
        await this.client.queryArray("COMMIT");
    }

    async rollback(): Promise<void> {
        await this.client.queryArray("ROLLBACK");
    }
}
