import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";

export class OwnerNameValue {
	static fromString(v: string): Either<ValidationError, OwnerNameValue> {
		try {
			return right(new OwnerNameValue(v));
		} catch (error) {
			return left(error as ValidationError);
		}
	}

	private constructor(readonly value: string) {
		const re = /^[a-zA-Z]{2,}$/;
		const errors = [];
		const splits = value.split(" ");
		if (splits.length < 2) {
			errors.push("O nome do tutor deve conter pelo menos um nome e um sobrenome");
		}

		for (const split of splits) {
			if (!re.test(split)) {
				errors.push(`${split}: no nome do tutor deve 2 ou mais letras`);
			}
		}

		if (errors.length > 0) {
			throw new ValidationError("OwnerNameValue", errors);
		}
	}
}
