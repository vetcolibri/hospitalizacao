import { Either, left, right } from "@shared/either.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { z } from "@deps/zod";

export class DateValue {
	readonly value: string;

	private constructor(value: string) {
		// Validation is now handled by Zod schema in fromString
		this.value = value;
	}

	static fromString(dateString: string): Either<ValidationError, DateValue> {
		const result = DATE_VALUE_SCHEMA.safeParse({ value: dateString });

		if (!result.success) {
			const errors = result.error.issues.map((err) => err.message);
			return left(new ValidationError("DateValue", errors));
		}

		return right(new DateValue(result.data.value));
	}

	static today(): DateValue {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, "0");
		const day = String(today.getDate()).padStart(2, "0");

		return new DateValue(`${year}-${month}-${day}`);
	}

	toString(): string {
		return this.value;
	}

	toDate(): Date {
		return new Date(this.value);
	}

	earlierThan(other: DateValue): boolean {
		return this.toDate() < other.toDate();
	}
}

export const DATE_VALUE_SCHEMA = z.object({
	value: z.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "O [Date Value] tem um valor inválido"),
});
