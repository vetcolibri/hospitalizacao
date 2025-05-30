import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";

export class OrangestIdValue {
	static fromString(v: string): Either<ValidationError, OrangestIdValue> {
		try {
			return right(new OrangestIdValue(v));
		} catch (error) {
			return left(error as ValidationError);
		}
	}

	private constructor(readonly value: string) {
		const re = /^\d{5}[A-Z]$/;
		if (!re.test(value)) {
			throw new ValidationError("OrangestIdValue", ["ID Orangest inválido"]);
		}
	}
}
