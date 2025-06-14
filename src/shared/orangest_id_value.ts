import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

export class OrangestIdValue {
	static fromString(value: string): Either<ValidationError, OrangestIdValue> {
		const result = ORANGEST_ID_VALUE_SCHEMA.safeParse({ value });

		if (!result.success) {
			const errors = result.error.issues.map((err) => err.message);
			return left(new ValidationError("OrangestIdValue", errors));
		}

		return right(new OrangestIdValue(result.data.value));
	}

	private constructor(readonly value: string) {}
}

export const ORANGEST_ID_VALUE_SCHEMA = z.object({
	value: z.string()
		.regex(/^\d{5}[A-Z]$/, "ID Orangest inválido"),
});
