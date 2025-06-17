import { DateValue } from "@shared/date_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

export class MeasurementValue {
	static create(
		dateTime: DateValue,
		measurementTypeId: string,
		value: string | number,
		notes?: string,
	): Either<ValidationError, MeasurementValue> {
		const result = MEASUREMENT_SCHEMA.safeParse({
			dateTime,
			measurementTypeId,
			value,
			notes,
		});

		if (!result.success) {
			const errors = result.error.issues.map((issue) => issue.message);
			return left(new ValidationError("MeasurementValue", errors));
		}

		return right(
			new MeasurementValue(
				result.data.dateTime,
				result.data.measurementTypeId,
				result.data.value,
				result.data.notes,
			),
		);
	}

	readonly dateTime: DateValue;
	readonly measurementTypeId: string;
	readonly value: string | number;
	readonly notes?: string;

	private constructor(
		dateTime: DateValue,
		measurementTypeId: string,
		value: string | number,
		notes?: string,
	) {
		this.dateTime = dateTime;
		this.measurementTypeId = measurementTypeId;
		this.value = value;
		this.notes = notes;
	}
}

export const MEASUREMENT_SCHEMA = z.object({
	dateTime: z.custom<DateValue>(
		(val) => val instanceof DateValue,
		"A data e hora da medição são obrigatórias",
	),
	measurementTypeId: z.string().trim()
		.min(1, "O ID do tipo de medição é obrigatório")
		.max(50, "O ID do tipo de medição não pode ter mais de 50 caracteres"),
	value: z.union([
		z.number().finite("O valor numérico deve ser um número válido"),
		z.string()
			.transform(val => val.trim())
			.refine(val => val.length > 0, "O valor da medição é obrigatório")
			.refine(val => val.length <= 100, "O valor da medição não pode ter mais de 100 caracteres"),
	]),
	notes: z.string()
		.max(500, "As notas não podem ter mais de 500 caracteres")
		.optional(),
});
