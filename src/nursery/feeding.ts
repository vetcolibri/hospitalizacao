import { DateValue } from "@shared/date_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { z } from "@deps/zod";
import { FeedingTypeEnum } from "./feeding_type_enum.ts";
import { FeedingCategoryEnum } from "./feeding_category_enum.ts";

export class Feeding {
	static create(
		dateTime: DateValue,
		type: FeedingTypeEnum,
		notes: string,
		feedingCategory?: FeedingCategoryEnum,
		appetiteScore?: number,
	): Either<ValidationError, Feeding> {
		const result = FEEDING_SCHEMA.safeParse({
			dateTime,
			type,
			notes,
			feedingCategory,
			appetiteScore,
		});

		if (!result.success) {
			const errors = result.error.issues.map((issue) => issue.message);
			return left(new ValidationError("Feeding", errors));
		}

		return right(
			new Feeding(
				result.data.dateTime,
				result.data.type,
				result.data.notes,
				result.data.feedingCategory,
				result.data.appetiteScore,
			),
		);
	}

	readonly dateTime: DateValue;
	readonly type: FeedingTypeEnum;
	readonly notes: string;
	readonly feedingCategory?: FeedingCategoryEnum;
	readonly appetiteScore?: number;

	private constructor(
		dateTime: DateValue,
		type: FeedingTypeEnum,
		notes: string,
		feedingCategory?: FeedingCategoryEnum,
		appetiteScore?: number,
	) {
		this.dateTime = dateTime;
		this.type = type;
		this.notes = notes;
		this.feedingCategory = feedingCategory;
		this.appetiteScore = appetiteScore;
	}
}

export const FEEDING_SCHEMA = z.object({
	dateTime: z.custom<DateValue>(
		(val) => val instanceof DateValue,
		"A data e hora da alimentação são obrigatórias",
	),
	type: z.enum(FeedingTypeEnum),
	notes: z.string().max(500, "As notas não podem ter mais de 500 caracteres"),
	feedingCategory: z.enum(FeedingCategoryEnum).optional(),
	appetiteScore: z.number().int().min(0).max(10).optional(),
}).refine((data) => {
	// If type is FEEDING, then feedingCategory and appetiteScore are required
	if (data.type === FeedingTypeEnum.FEEDING) {
		return data.feedingCategory !== undefined && data.appetiteScore !== undefined;
	}
	return true;
}, {
	message:
		"Quando o tipo é 'FEEDING', a categoria de alimentação e pontuação de apetite são obrigatórias",
	path: ["feedingCategory", "appetiteScore"],
}).refine((data) => {
	// If type is not FEEDING, then feedingCategory and appetiteScore should not be provided
	if (data.type !== FeedingTypeEnum.FEEDING) {
		return data.feedingCategory === undefined && data.appetiteScore === undefined;
	}
	return true;
}, {
	message:
		"Categoria de alimentação e pontuação de apetite só devem ser fornecidas quando o tipo é 'FEEDING'",
	path: ["feedingCategory", "appetiteScore"],
});
