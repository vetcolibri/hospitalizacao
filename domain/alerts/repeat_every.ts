export class RepeatEvery {
	private value: number;

	constructor(value: number) {
		this.value = value;
	}

	isValid() {
		return this.value > 1;
	}

	getValue(): number {
		return this.value;
	}
}
