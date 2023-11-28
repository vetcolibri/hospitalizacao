import { ID } from "../id.ts";

export enum BudgetStatus {
	UNPAID = "NÃO PAGO",
	PENDING = "PENDENTE",
	PENDING_WITH_BUDGET_SENT = "PENDENTE (ORÇAMENTO ENVIADO)",
	PAID = "PAGO",
}

export class Budget {
	budgetId: ID;
	readonly startOn: Date;
	readonly endOn: Date;
	readonly status: BudgetStatus;
	durationInDays = 0;

	constructor(startOn: string, endOn: string, status: string) {
		this.budgetId = ID.RandomID();
		this.startOn = new Date(startOn);
		this.endOn = new Date(endOn);

		if (status === BudgetStatus.PAID) {
			this.status = BudgetStatus.PAID;
		} else if (status === BudgetStatus.PENDING) {
			this.status = BudgetStatus.PENDING;
		} else if (status === BudgetStatus.PENDING_WITH_BUDGET_SENT) {
			this.status = BudgetStatus.PENDING_WITH_BUDGET_SENT;
		} else {
			this.status = BudgetStatus.UNPAID;
		}

		this.durationInDays = this.calculateDays();
	}

	calculateDays(): number {
		const millisecondsPerDay = 1000 * 60 * 60 * 24;
		const millisBetween = this.endOn.getTime() - this.startOn.getTime();
		const days = millisBetween / millisecondsPerDay;
		return Math.floor(days);
	}

	isActive(): boolean {
		return this.status === BudgetStatus.PENDING ||
			this.status === BudgetStatus.UNPAID ||
			this.status === BudgetStatus.PENDING_WITH_BUDGET_SENT;
	}
}
