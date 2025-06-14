import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export class IdValue {
	static random(): IdValue {
		const randomId = Array
			.from({ length: 8 }, () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])
			.join("");

		return new IdValue(randomId);
	}

	static fromString(value: string): Either<ValidationError, IdValue> {
		const result = ID_VALUE_SCHEMA.safeParse({ value });

		if (!result.success) {
			const errors = result.error.issues.map((err) => err.message);
			return left(new ValidationError("IdValue", errors));
		}

		return right(new IdValue(result.data.value));
	}

	private constructor(readonly value: string) {}
}

export const ID_VALUE_SCHEMA = z.object({
	value: z.string()
		.length(8, "O [Id Value] deve ter exactamente 8 caracteres")
		.regex(/^[a-zA-Z0-9]{8}$/, "O [Id Value] deve conter apenas letras e números"),
});
