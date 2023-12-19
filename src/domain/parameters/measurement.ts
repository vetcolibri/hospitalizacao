export class Measurement {
	readonly value: unknown;

	private constructor(value: unknown) {
		this.value = value;
	}

	static new(value: unknown) {
		return new Measurement(value);
	}

	withString(): string {
		return String(this.value);
	}

	withNumber(): number {
		return Number(this.value);
	}
}
