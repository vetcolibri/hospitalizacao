import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

export class ContactPersonValue {
	static create(
		fullName: string,
		phoneNumber: PhoneNumberValue,
		email?: string,
	): Either<ValidationError, ContactPersonValue> {
		const result = CONTACT_PERSON_VALUE_SCHEMA.safeParse({ fullName, phoneNumber, email });

		if (!result.success) {
			const errors = result.error.issues.map((issue) => issue.message);
			return left(new ValidationError("ContactPersonValue", errors));
		}

		return right(
			new ContactPersonValue(result.data.fullName, result.data.phoneNumber, result.data.email),
		);
	}

	readonly fullName: string;
	readonly phoneNumber: PhoneNumberValue;
	readonly email?: string;

	private constructor(
		fullName: string,
		phoneNumber: PhoneNumberValue,
		email?: string,
	) {
		this.fullName = fullName;
		this.phoneNumber = phoneNumber;
		this.email = email;
	}
}

export const CONTACT_PERSON_VALUE_SCHEMA = z.object({
	fullName: z.string().trim().min(2, "O nome completo deve ter pelo menos 2 caracteres"),
	phoneNumber: z.custom<PhoneNumberValue>(
		(val) => val instanceof PhoneNumberValue,
		"O número de telefone é obrigatório",
	),
	email: z.string().trim().refine(
		(val) => val.length === 0 || /^[^ \s@]+@[^ \s@]+\.[^ \s@]+$/.test(val),
		"Email inválido",
	).optional(),
});
