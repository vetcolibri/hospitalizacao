import { DateValue } from "@shared/date_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";
import { IdValue } from "@shared/id_value.ts";
import { z } from "@deps/zod";

export class PeriodicReport {
	static create(
		id: IdValue,
		timestamp: DateValue,
		consciousnessStates: ConsciousnessStateEnum,
		annotations: string,
	): Either<ValidationError, PeriodicReport> {
		const result = PERIODIC_REPORT_SCHEMA.safeParse({
			id,
			timestamp,
			consciousnessStates,
			annotations,
		});

		if (!result.success) {
			const errors = result.error.issues.map((issue) => issue.message);
			return left(new ValidationError("PeriodicReport", errors));
		}

		return right(
			new PeriodicReport(
				result.data.id,
				result.data.timestamp,
				result.data.consciousnessStates,
				result.data.annotations,
			),
		);
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
	}
}

export const PERIODIC_REPORT_SCHEMA = z.object({
	id: z.custom<IdValue>(
		(val) => val instanceof IdValue,
		"O ID do relatório periódico é obrigatório",
	),
	timestamp: z.custom<DateValue>((val) => val instanceof DateValue, "O timestamp é obrigatório"),
	consciousnessStates: z.enum(ConsciousnessStateEnum),
	annotations: z.string().max(1000, "As anotações não podem ter mais de 1000 caracteres"),
});
