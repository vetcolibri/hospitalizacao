import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

export class OwnerNameValue {
	static schema = z.object({
		value: z.string()
			.refine(
				(v) => v.split(" ").length >= 2,
				"O nome do tutor deve conter pelo menos um nome e um sobrenome",
			)
			.refine(
				(v) => v.split(" ").every((s) => /^[a-zA-Z]{2,}$/.test(s)),
				"Cada parte do nome do tutor deve conter pelo menos 2 letras",
			),
	}).transform((data) => new OwnerNameValue(data.value));

	static fromString(value: string): Either<ValidationError, OwnerNameValue> {
		const result = OwnerNameValue.schema.safeParse({ value });

		if (!result.success) {
			const errors = result.error.errors.map((err) => err.message);
			return left(new ValidationError("OwnerNameValue", errors));
		}

		return right(result.data);
	}

	private constructor(readonly value: string) {}
}
