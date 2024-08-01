import { ID } from "shared/id.ts";

export enum BudgetStatus {
	UnPaid = "NÃO PAGO",
	Pending = "PENDENTE",
	PendingWithBudgetSent = "PENDENTE (ORÇAMENTO ENVIADO)",
	Paid = "PAGO",
}

type Options = {
	hospitalizationId: string;
	startOn: string;
	endOn: string;
	status: string;
	budgetId: string;
};

export class Budget {
	readonly budgetId: ID;
	readonly hospitalizationId: ID;
	#startOn: Date;
	#endOn: Date;
	#status: BudgetStatus;

	constructor(
		budgetId: ID,
		hospitalizationId: ID,
		startOn: string,
		endOn: string,
		status: string,
	) {
		this.budgetId = budgetId;
		this.hospitalizationId = hospitalizationId;
		this.#startOn = new Date(startOn);
		this.#endOn = new Date(endOn);
		this.#status = this.#setStatus(status);
	}

	static restore(data: Options): Budget {
		const budget = new Budget(
			ID.fromString(data.budgetId),
			ID.fromString(data.hospitalizationId),
			data.startOn,
			data.endOn,
			data.status,
		);

		return budget;
	}

	update(startOn: string, endOn: string): void {
		this.#startOn = new Date(startOn);
		this.#endOn = new Date(endOn);
	}

	changeStatus(status: string): void {
		this.#status = this.#setStatus(status);
	}

	isPaid(): boolean {
		return this.#status === BudgetStatus.Paid;
	}

	unpaid(): boolean {
		return this.#status === BudgetStatus.UnPaid;
	}

	pending(): boolean {
		return this.#status === BudgetStatus.Pending;
	}

	itWasSent(): boolean {
		return this.#status === BudgetStatus.PendingWithBudgetSent;
	}

	#setStatus(value: string) {
		if (value === BudgetStatus.Paid) {
			return BudgetStatus.Paid;
		}

		if (value === BudgetStatus.Pending) {
			return BudgetStatus.Pending;
		}

		if (value === BudgetStatus.PendingWithBudgetSent) {
			return BudgetStatus.PendingWithBudgetSent;
		}

		return BudgetStatus.UnPaid;
	}

	get status(): string {
		return this.#status.toString();
	}

	get startOn(): Date {
		return this.#startOn;
	}

	get endOn(): Date {
		return this.#endOn;
	}
}
