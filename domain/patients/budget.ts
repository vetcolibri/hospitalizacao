export enum BudgetStatus {
	PAID = "PAGO",
	PENDING = "PENDENTE",
	UNPAID = "NÃO PAGO",
}

export class Budget {
	readonly startOn: Date;
	readonly endOn: Date;
	readonly status: BudgetStatus;
	durationInDays = 0;

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

		this.durationInDays = this.calculateDays();
	}

	calculateDays(): number {
		const millisecondsPerDay = 1000 * 60 * 60 * 24;
		const millisBetween = this.endOn.getTime() - this.startOn.getTime();
		const days = millisBetween / millisecondsPerDay;
		return Math.floor(days);
	}

	isActive(): boolean {
		return this.status === BudgetStatus.PENDING || this.status === BudgetStatus.UNPAID;
	}
}
