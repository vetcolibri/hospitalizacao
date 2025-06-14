import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

export class PhoneNumberValue {
	static schema = z.object({
		number: z.string()
			.transform((value) => value.replace(/\s/g, ""))
			.refine(
				(value) => /^\d{4,15}$/.test(value),
				"O número de telefone deve ter entre 4 e 15 dígitos",
			),
		whatsapp: z.boolean(),
		countryCode: z.string()
			.default("244")
			.refine((value) => /^\d{1,3}$/.test(value), "O código de país deve ter entre 1 e 3 dígitos"),
	}).transform((data) => new PhoneNumberValue(data.number, data.whatsapp, data.countryCode));

	static create(
		number: string,
		whatsapp: boolean,
		countryCode = "244",
	): Either<ValidationError, PhoneNumberValue> {
		const result = PhoneNumberValue.schema.safeParse({ number, whatsapp, countryCode });

		if (!result.success) {
			const errors = result.error.errors.map((err) => err.message);
			return left(new ValidationError("PhoneNumberValue", errors));
		}

		return right(result.data);
	}

	readonly number: string;
	readonly countryCode: string;

	private constructor(number: string, readonly whatsapp: boolean, countryCode = "244") {
		this.number = number;
		this.countryCode = countryCode;
	}

	get formattedNumber(): string {
		return `+${this.countryCode}${this.number}`;
	}
}
