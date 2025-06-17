import { DateValue } from "@shared/date_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";
import { EliminationTypeEnum } from "./elimination_type_enum.ts";

export class Elimination {
	static create(
		dateTime: DateValue,
		type: EliminationTypeEnum,
		aspect: string,
	): Either<ValidationError, Elimination> {
		const result = ELIMINATION_SCHEMA.safeParse({
			dateTime,
			type,
			aspect,
		});

		if (!result.success) {
			const errors = result.error.issues.map((issue) => issue.message);
			return left(new ValidationError("Elimination", errors));
		}

		return right(
			new Elimination(
				result.data.dateTime,
				result.data.type,
				result.data.aspect,
			),
		);
	}

	readonly dateTime: DateValue;
	readonly type: EliminationTypeEnum;
	readonly aspect: string;

	private constructor(
		dateTime: DateValue,
		type: EliminationTypeEnum,
		aspect: string,
	) {
		this.dateTime = dateTime;
		this.type = type;
		this.aspect = aspect;
	}
}

export const ELIMINATION_SCHEMA = z.object({
	dateTime: z.custom<DateValue>(
		(val) => val instanceof DateValue,
		"A data e hora da eliminação são obrigatórias",
	),
	type: z.enum(EliminationTypeEnum),
	aspect: z.string().trim().min(1, "O aspecto da eliminação é obrigatório").max(
		200,
		"O aspecto não pode ter mais de 200 caracteres",
	),
});
