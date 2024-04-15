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
	readonly hospitalizationId: ID;
	readonly startOn: Date;
	readonly endOn: Date;
	#budgetId: ID;
	#status: BudgetStatus;

	constructor(hospitalizationId: string, startOn: string, endOn: string, status: string) {
		this.hospitalizationId = ID.fromString(hospitalizationId);
		this.#budgetId = ID.random();
		this.startOn = new Date(startOn);
		this.endOn = new Date(endOn);
		this.#status = this.setStatus(status);
	}

	static restore(data: Options): Budget {
		const budget = new Budget(
			data.hospitalizationId,
			data.startOn,
			data.endOn,
			data.status,
		);

		budget.#budgetId = ID.fromString(data.budgetId);

		return budget;
	}

	private setStatus(value: string) {
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

	get budgetId(): string {
		return this.#budgetId.value;
	}
}
