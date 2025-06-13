import { DateValue } from "@shared/date_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";
import { IdValue } from "@shared/id_value.ts";

export class PeriodicReport {
	static create(
		id: IdValue,
		timestamp: DateValue,
		consciousnessStates: ConsciousnessStateEnum,
		annotations: string,
	): Either<ValidationError, PeriodicReport> {
		try {
			return right(
				new PeriodicReport(
					id,
					timestamp,
					consciousnessStates,
					annotations,
				),
			);
		} catch (error) {
			return left(error as ValidationError);
		}
	}

	readonly id: IdValue;
	readonly timestamp: DateValue;
	readonly consciousnessStates: ConsciousnessStateEnum;
	readonly annotations: string;

	private constructor(
		id: IdValue,
		timestamp: DateValue,
		consciousnessStates: ConsciousnessStateEnum,
		annotations: string,
	) {
		this.id = id;
		this.timestamp = timestamp;
		this.consciousnessStates = consciousnessStates;
		this.annotations = annotations;

		const errors: string[] = [];

		if (id === null || id === undefined) {
			errors.push("O ID do relatório periódico é obrigatório");
		}

		if (timestamp === null || timestamp === undefined) {
			errors.push("O timestamp é obrigatório");
		}

		if (annotations && annotations.length > 1000) {
			errors.push("As anotações não podem ter mais de 1000 caracteres");
		}

		if (errors.length > 0) {
			throw new ValidationError("PeriodicReport", errors);
		}
	}
}
