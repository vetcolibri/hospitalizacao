import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";

export class PhoneNumberValue {
	static create(
		number: string,
		whatsapp: boolean,
		countryCode = "244",
	): Either<ValidationError, PhoneNumberValue> {
		try {
			return right(new PhoneNumberValue(number, whatsapp, countryCode));
		} catch (error) {
			return left(error as ValidationError);
		}
	}

	readonly number: string;
	readonly countryCode: string;

	private constructor(number: string, readonly whatsapp: boolean, countryCode = "244") {
		const errors = [];

		// Remove empty spaces
		this.number = number.replace(/\s/g, "");
		this.countryCode = countryCode;

		const number_re = /^\d{4,15}$/;
		const countryCode_re = /^\d{1,3}$/;

		if (!number_re.test(this.number)) {
			errors.push("O número de telefone deve ter entre 4 e 15 dígitos");
		}

		if (!countryCode_re.test(this.countryCode)) {
			errors.push("O código de país deve ter entre 1 e 3 dígitos");
		}

		if (errors.length) {
			throw new ValidationError("PhoneNumberValue", errors);
		}
	}

	get formattedNumber(): string {
		return `+${this.countryCode}${this.number}`;
	}
}
