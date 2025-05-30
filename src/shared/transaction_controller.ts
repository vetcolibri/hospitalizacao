export interface TransactionController {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
