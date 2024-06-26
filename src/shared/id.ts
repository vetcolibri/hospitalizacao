export class ID {
	#value: string;

	private constructor(raw: string) {
		this.#value = raw;
	}

	static fromString(raw: string): ID {
		return new ID(raw);
	}

	static random(): ID {
		const value = crypto.randomUUID().replaceAll("-", "");
		return new ID(value);
	}

	equals(id: ID): boolean {
		return this.value === id.value;
	}

	get value(): string {
		return this.#value.toString();
	}
}
