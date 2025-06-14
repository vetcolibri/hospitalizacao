import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

export class OrangestIdValue {
	static schema = z.object({
		value: z.string()
			.regex(/^\d{5}[A-Z]$/, "ID Orangest inválido"),
	}).transform((data) => new OrangestIdValue(data.value));

	static fromString(value: string): Either<ValidationError, OrangestIdValue> {
		const result = OrangestIdValue.schema.safeParse({ value });

		if (!result.success) {
			const errors = result.error.errors.map((err) => err.message);
			return left(new ValidationError("OrangestIdValue", errors));
		}

		return right(result.data);
	}

	private constructor(readonly value: string) {}
}
