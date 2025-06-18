import { IdValue } from "@shared/id_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";

export class MeasurementTypeIdValue {
	static random(): MeasurementTypeIdValue {
		const randomId = IdValue.random();
		return new MeasurementTypeIdValue(randomId.value);
	}

	static fromString(value: string): Either<ValidationError, MeasurementTypeIdValue> {
		const result = MEASUREMENT_TYPE_ID_VALUE_SCHEMA.safeParse({ value });

		if (!result.success) {
			const errors = result.error.issues.map((err) => err.message);
			return left(new ValidationError("MeasurementTypeIdValue", errors));
		}

		return right(new MeasurementTypeIdValue(result.data.value));
	}

	private constructor(readonly value: string) {}
}

export type MeasurementUnit = "Continuous" | "Discrete";

// MeasurementRange can be either a numeric range or a list of string values
// The first element is the name of the range, the second element is either
// a numeric range [min, max] or a list of string values
export type MeasurementRange = [string, [number, number]] | [string, string[]];

// Validation schemas
export const MEASUREMENT_TYPE_ID_VALUE_SCHEMA = z.object({
	value: z.string()
		.length(8, "O ID do tipo de medição deve ter exactamente 8 caracteres")
		.regex(/^[a-zA-Z0-9]{8}$/, "O ID do tipo de medição deve conter apenas letras e números"),
});

const MEASUREMENT_RANGE_SCHEMA = z.union([
	z.tuple([
		z.string(),
		z.tuple([z.number(), z.number()]).refine(
			([min, max]) => min < max,
			"O valor mínimo deve ser menor que o máximo",
		),
	]),
	z.tuple([
		z.string(),
		z.array(z.string()).min(1, "A lista de valores deve ter pelo menos um item"),
	]),
]);

const NAME_SCHEMA = z.string()
	.trim()
	.min(1, "O nome do tipo de medição é obrigatório")
	.max(100, "O nome do tipo de medição não pode ter mais de 100 caracteres");

const DESCRIPTION_SCHEMA = z.string()
	.trim()
	.min(1, "A descrição do tipo de medição é obrigatória")
	.max(500, "A descrição do tipo de medição não pode ter mais de 500 caracteres");

export const MEASUREMENT_TYPE_SCHEMA = z.object({
	id: z.custom<MeasurementTypeIdValue>(
		(val) => val instanceof MeasurementTypeIdValue,
		"ID do tipo de medição inválido",
	),
	name: NAME_SCHEMA,
	unit: z.enum(["Continuous", "Discrete"]),
	description: DESCRIPTION_SCHEMA,
	normalRange: MEASUREMENT_RANGE_SCHEMA,
	veryLowRange: MEASUREMENT_RANGE_SCHEMA.optional(),
	lowRange: MEASUREMENT_RANGE_SCHEMA.optional(),
	veryHighRange: MEASUREMENT_RANGE_SCHEMA.optional(),
	highRange: MEASUREMENT_RANGE_SCHEMA.optional(),
});

export class MeasurementType {
	static create(
		id: MeasurementTypeIdValue,
		name: string,
		unit: MeasurementUnit,
		description: string,
		ranges: {
			normal: MeasurementRange;
			veryLow?: MeasurementRange;
			low?: MeasurementRange;
			high?: MeasurementRange;
			veryHigh?: MeasurementRange;
		},
	): Either<ValidationError, MeasurementType> {
		const result = MEASUREMENT_TYPE_SCHEMA.safeParse({
			id,
			name,
			unit,
			description,
			normalRange: ranges.normal,
			veryLowRange: ranges.veryLow,
			lowRange: ranges.low,
			highRange: ranges.high,
			veryHighRange: ranges.veryHigh,
		});

		if (!result.success) {
			const errors = result.error.issues.map((err: any) => err.message);
			return left(new ValidationError("MeasurementType", errors));
		}

		return right(
			new MeasurementType(
				result.data.id,
				result.data.name,
				result.data.unit,
				result.data.description,
				result.data.normalRange,
				result.data.veryLowRange,
				result.data.lowRange,
				result.data.highRange,
				result.data.veryHighRange,
			),
		);
	}

	static recreate(
		id: MeasurementTypeIdValue,
		name: string,
		unit: MeasurementUnit,
		description: string,
		normalRange: MeasurementRange,
		veryLowRange?: MeasurementRange,
		lowRange?: MeasurementRange,
		highRange?: MeasurementRange,
		veryHighRange?: MeasurementRange,
	): MeasurementType {
		const measurementType = MeasurementType.create(
			id,
			name,
			unit,
			description,
			{
				normal: normalRange,
				veryLow: veryLowRange,
				low: lowRange,
				high: highRange,
				veryHigh: veryHighRange,
			},
		).right!;
		return measurementType;
	}

	readonly id: MeasurementTypeIdValue;
	readonly name: string;
	readonly unit: MeasurementUnit;
	readonly description: string;
	readonly normalRange: MeasurementRange;
	readonly veryLowRange?: MeasurementRange;
	readonly lowRange?: MeasurementRange;
	readonly veryHighRange?: MeasurementRange;
	readonly highRange?: MeasurementRange;

	private constructor(
		id: MeasurementTypeIdValue,
		name: string,
		unit: MeasurementUnit,
		description: string,
		normalRange: MeasurementRange,
		veryLowRange?: MeasurementRange,
		lowRange?: MeasurementRange,
		highRange?: MeasurementRange,
		veryHighRange?: MeasurementRange,
	) {
		this.id = id;
		this.name = name;
		this.unit = unit;
		this.description = description;
		this.normalRange = normalRange;
		this.veryLowRange = veryLowRange;
		this.lowRange = lowRange;
		this.highRange = highRange;
		this.veryHighRange = veryHighRange;
	}

	clone(): MeasurementType {
		return new MeasurementType(
			this.id,
			this.name,
			this.unit,
			this.description,
			this.normalRange,
			this.veryLowRange,
			this.lowRange,
			this.highRange,
			this.veryHighRange,
		);
	}
}
