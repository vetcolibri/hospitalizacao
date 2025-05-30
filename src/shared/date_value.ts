import { Either, left, right } from "@shared/either.ts";
import { ValidationError } from "@shared/validation_error.ts";

export class DateValue {
	readonly value: string;

	private constructor(value: string) {
		const regex = /^\d{4}-\d{2}-\d{2}$/;
		if (!regex.test(value)) {
			throw new ValidationError("DateValue", [`O [Date Value] tem um valor inválido [${value}]`]);
		}

		this.value = value;
	}

	static fromString(dateString: string): Either<ValidationError, DateValue> {
		try {
			return right(new DateValue(dateString));
		} catch (error) {
			return left(error as ValidationError);
		}
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
