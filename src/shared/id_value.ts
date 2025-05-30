import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export class IdValue {
	static random(): IdValue {
		const randomId = Array
			.from({ length: 8 }, () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])
			.join("");

		return new IdValue(randomId);
	}

	static fromString(v: string): Either<ValidationError, IdValue> {
		try {
			return right(new IdValue(v));
		} catch (error) {
			return left(error as ValidationError);
		}
	}

	private constructor(readonly value: string) {
		const regex = /^[a-zA-Z0-9]{8}$/;

		if (!regex.test(value)) {
			throw new ValidationError("IdValue", [`O [Id Value] tem um valor inválido [${value}]`]);
		}
	}
}
