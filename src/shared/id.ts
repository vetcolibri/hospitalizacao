import { z } from "@deps/zod";
import { Either, left, right } from "./either.ts";
import { ValidationError } from "./validation_error.ts";

export class ID {
	#value: string;

	private constructor(raw: string) {
		this.#value = raw;
	}

	static fromString(raw: string): Either<ValidationError, ID> {
		const result = ID_SCHEMA.safeParse({ value: raw });
		if (!result.success) {
			const errors = result.error.issues.map((issue) => issue.message);
			return left(new ValidationError("ID", errors));
		}
		return right(new ID(result.data.value));
	}

	static random(): ID {
		const value = crypto.randomUUID().replaceAll("-", "");
		// This directly creates an ID, assuming UUID format is valid by default.
		// If strict adherence to a specific format (like 32 hex) was required from random,
		// one might adjust, but typically UUIDs are fine.
		return new ID(value);
	}

	equals(id: ID): boolean {
		return this.value === id.value;
	}

	get value(): string {
		return this.#value.toString();
	}
}

export const ID_SCHEMA = z.object({
	value: z.string()
		.length(32, "ID must be 32 characters long")
		.regex(/^[a-fA-F0-9]{32}$/, "ID must be a 32-character hexadecimal string"),
});
