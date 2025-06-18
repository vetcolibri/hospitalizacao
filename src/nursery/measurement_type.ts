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

export type MeasurementUnitType = "Continuous" | "Discrete";

// MeasurementRange can be either a numeric range or a list of string values
// The first element is the name of the range, the second element is either
// a numeric range [min, max] or a list of string values
export type MeasurementRange = [string, [number, number]] | [string, string[]];
export type MeasumentRanges = {
	normal: MeasurementRange;
	veryLow?: MeasurementRange;
	low?: MeasurementRange;
	high?: MeasurementRange;
	veryHigh?: MeasurementRange;
};

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
	unit: z.string()
		.trim()
		.min(1, "A unidade é obrigatória")
		.max(50, "A unidade não pode ter mais de 50 caracteres"),
	unitType: z.enum(["Continuous", "Discrete"]),
	ranges: z.object({
		normal: MEASUREMENT_RANGE_SCHEMA,
		veryLow: MEASUREMENT_RANGE_SCHEMA.optional(),
		low: MEASUREMENT_RANGE_SCHEMA.optional(),
		high: MEASUREMENT_RANGE_SCHEMA.optional(),
		veryHigh: MEASUREMENT_RANGE_SCHEMA.optional(),
	}),
});

export class MeasurementType {
	static create(
		id: MeasurementTypeIdValue,
		name: string,
		unit: string,
		unitType: MeasurementUnitType,
		ranges: MeasumentRanges,
	): Either<ValidationError, MeasurementType> {
		const result = MEASUREMENT_TYPE_SCHEMA.safeParse({
			id,
			name,
			unit,
			unitType,
			ranges,
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
				result.data.unitType,
				result.data.ranges,
			),
		);
	}

	static recreate(
		id: MeasurementTypeIdValue,
		name: string,
		unit: string,
		unitType: MeasurementUnitType,
		ranges: MeasumentRanges,
	): MeasurementType {
		const measurementType = MeasurementType.create(
			id,
			name,
			unit,
			unitType,
			ranges,
		).right!;
		return measurementType;
	}

	readonly id: MeasurementTypeIdValue;
	readonly name: string;
	readonly unit: string;
	readonly unitType: MeasurementUnitType;
	readonly ranges: MeasumentRanges;

	private constructor(
		id: MeasurementTypeIdValue,
		name: string,
		unit: string,
		unitType: MeasurementUnitType,
		ranges: MeasumentRanges,
	) {
		this.id = id;
		this.name = name;
		this.unit = unit;
		this.unitType = unitType;
		this.ranges = ranges;
	}

	clone(): MeasurementType {
		return new MeasurementType(
			this.id,
			this.name,
			this.unit,
			this.unitType,
			this.ranges,
		);
	}
}
