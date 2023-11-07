export enum BudgetStatus {
	PAID = "PAGO",
	PENDING = "PENDENTE",
	UNPAID = "NÃO PAGO",
}

export class Budget {
	readonly startOn: Date;
	readonly endOn: Date;
	readonly status: BudgetStatus;

	constructor(startOn: string, endOn: string, status: string) {
		this.startOn = new Date(startOn);
		this.endOn = new Date(endOn);

		if (status === BudgetStatus.PAID) {
			this.status = BudgetStatus.PAID;
		} else if (status === BudgetStatus.PENDING) {
			this.status = BudgetStatus.PENDING;
		} else {
			this.status = BudgetStatus.UNPAID;
		}
	}
}
