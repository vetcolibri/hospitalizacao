export class Measurement {
	#value: string | number;

	private constructor(value: string | number) {
		this.#value = value;
	}

	static fromString(value: string) {
		return new Measurement(value);
	}

	static fromNumber(value: number) {
		return new Measurement(value);
	}

	toString(): string {
		return String(this.#value);
	}

	toNumber(): number {
		return Number(this.#value);
	}
}
