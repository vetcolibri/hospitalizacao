import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";

export class ContactPersonValue {
	static create(
		fullName: string,
		phoneNumber: PhoneNumberValue,
		email?: string,
	): Either<ValidationError, ContactPersonValue> {
		try {
			return right(new ContactPersonValue(fullName, phoneNumber, email));
		} catch (error) {
			return left(error as ValidationError);
		}
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

		const errors: string[] = [];

		if (!fullName || fullName.trim().length < 2) {
			errors.push("O nome completo deve ter pelo menos 2 caracteres");
		}

		if (!phoneNumber) {
			errors.push("O número de telefone é obrigatório");
		}

		if (email && email.trim().length > 0) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				errors.push("Email inválido");
			}
		}

		if (errors.length > 0) {
			throw new ValidationError("ContactPersonValue", errors);
		}
	}
}
