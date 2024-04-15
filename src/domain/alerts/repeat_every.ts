export class RepeatEvery {
	#value: number;

	constructor(seconds: number) {
		this.#value = seconds;
	}

	isValid() {
		return this.#value > 1;
	}

	get value(): number {
		return this.#value;
	}
}
