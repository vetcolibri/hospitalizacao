export class BirthDate {
	readonly value: Date;

	constructor(value: string) {
		this.value = new Date(value);
	}

	private calculateAge(): Date {
		const today = new Date();
		return new Date(today.getTime() - this.value.getTime());
	}

	getYears(): number {
		return this.calculateAge().getUTCFullYear() - 1970;
	}

	getMonths(): number {
		return this.calculateAge().getUTCMonth();
	}

	getDays(): number {
		return this.calculateAge().getUTCDate() - 1;
	}

	get age(): string {
		let age = "";

		if (this.getYears() > 1) {
			age += ` ${this.getYears()} anos`;
		} else if (this.getYears() === 1) {
			age += ` ${this.getYears()} ano`;
		}

		if (this.getMonths() === 1) {
			age += ` ${this.getMonths()} mês`;
		} else if (this.getMonths() > 1) {
			age += ` ${this.getMonths()} meses`;
		}

		if (this.getDays() === 1 || this.getDays() === 0) {
			age += ` ${this.getDays()} dia`;
		} else if (this.getDays() > 1) {
			age += ` ${this.getDays()} dias`;
		}

		return age;
	}
}
