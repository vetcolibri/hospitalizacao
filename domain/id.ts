export class ID {
	value: string;

	private constructor(raw: string) {
		this.value = raw;
	}

	static New(raw: string): ID {
		return new ID(raw);
	}

	static RandomID(): ID {
		const value = crypto.randomUUID().replaceAll("-", "");
		return new ID(value);
	}

	toString(): string {
		return this.value.toString();
	}
}
