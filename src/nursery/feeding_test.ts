import { assertEquals } from "@deps/assert";
import { DateValue } from "@shared/date_value.ts";
import { Feeding } from "./feeding.ts";
import { FeedingTypeEnum } from "./feeding_type_enum.ts";
import { FeedingCategoryEnum } from "./feeding_category_enum.ts";
import { ValidationError } from "@shared/validation_error.ts";

Deno.test("Feeding", async (t) => {
	await t.step(
		"Deve criar uma alimentação válida do tipo FEEDING com categoria e pontuação",
		() => {
			const dateTimeOrErr = DateValue.fromString("2024-03-15");
			assertEquals(dateTimeOrErr.isRight(), true);
			const dateTime = dateTimeOrErr.right!;

			const notes = "Pet comeu bem durante a refeição.";
			const type = FeedingTypeEnum.FEEDING;
			const feedingCategory = FeedingCategoryEnum.WET;
			const appetiteScore = 8;

			const feedingOrErr = Feeding.create(
				dateTime,
				type,
				notes,
				feedingCategory,
				appetiteScore,
			);

			assertEquals(feedingOrErr.isRight(), true);
			const feeding = feedingOrErr.right!;
			assertEquals(feeding.dateTime, dateTime);
			assertEquals(feeding.type, type);
			assertEquals(feeding.notes, notes);
			assertEquals(feeding.feedingCategory, feedingCategory);
			assertEquals(feeding.appetiteScore, appetiteScore);
		},
	);

	await t.step(
		"Deve criar uma alimentação válida do tipo ORAL_FLUIDS sem categoria e pontuação",
		() => {
			const dateTimeOrErr = DateValue.fromString("2024-03-15");
			assertEquals(dateTimeOrErr.isRight(), true);
			const dateTime = dateTimeOrErr.right!;

			const notes = "Administrados fluidos orais.";
			const type = FeedingTypeEnum.ORAL_FLUIDS;

			const feedingOrErr = Feeding.create(
				dateTime,
				type,
				notes,
			);

			assertEquals(feedingOrErr.isRight(), true);
			const feeding = feedingOrErr.right!;
			assertEquals(feeding.dateTime, dateTime);
			assertEquals(feeding.type, type);
			assertEquals(feeding.notes, notes);
			assertEquals(feeding.feedingCategory, undefined);
			assertEquals(feeding.appetiteScore, undefined);
		},
	);

	await t.step("Deve criar uma alimentação válida do tipo IV_FLUIDS", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const notes = "Fluidos intravenosos administrados.";
		const type = FeedingTypeEnum.IV_FLUIDS;

		const feedingOrErr = Feeding.create(
			dateTime,
			type,
			notes,
		);

		assertEquals(feedingOrErr.isRight(), true);
		const feeding = feedingOrErr.right!;
		assertEquals(feeding.type, type);
		assertEquals(feeding.notes, notes);
	});

	await t.step("Deve criar uma alimentação válida do tipo MEDICATIONS", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const notes = "Medicação administrada conforme prescrição.";
		const type = FeedingTypeEnum.MEDICATIONS;

		const feedingOrErr = Feeding.create(
			dateTime,
			type,
			notes,
		);

		assertEquals(feedingOrErr.isRight(), true);
		const feeding = feedingOrErr.right!;
		assertEquals(feeding.type, type);
		assertEquals(feeding.notes, notes);
	});

	await t.step(
		"Deve retornar erro quando o tipo é FEEDING mas categoria e pontuação não são fornecidas",
		() => {
			const dateTimeOrErr = DateValue.fromString("2024-03-15");
			assertEquals(dateTimeOrErr.isRight(), true);
			const dateTime = dateTimeOrErr.right!;

			const notes = "Alimentação sem detalhes.";
			const type = FeedingTypeEnum.FEEDING;

			const feedingOrErr = Feeding.create(
				dateTime,
				type,
				notes,
			);

			assertEquals(feedingOrErr.isLeft(), true);
			const error = feedingOrErr.value as ValidationError;
			assertEquals(
				error.errors.some((e) =>
					e.includes("categoria de alimentação e pontuação de apetite são obrigatórias")
				),
				true,
			);
		},
	);

	await t.step(
		"Deve retornar erro quando o tipo não é FEEDING mas categoria e pontuação são fornecidas",
		() => {
			const dateTimeOrErr = DateValue.fromString("2024-03-15");
			assertEquals(dateTimeOrErr.isRight(), true);
			const dateTime = dateTimeOrErr.right!;

			const notes = "Fluidos com categoria incorreta.";
			const type = FeedingTypeEnum.ORAL_FLUIDS;
			const feedingCategory = FeedingCategoryEnum.KEEBLE;
			const appetiteScore = 5;

			const feedingOrErr = Feeding.create(
				dateTime,
				type,
				notes,
				feedingCategory,
				appetiteScore,
			);

			assertEquals(feedingOrErr.isLeft(), true);
			const error = feedingOrErr.value as ValidationError;
			assertEquals(
				error.errors.some((e) => e.includes("só devem ser fornecidas quando o tipo é 'FEEDING'")),
				true,
			);
		},
	);

	await t.step("Deve retornar erro se a data/hora for nula", () => {
		const notes = "Alimentação.";
		const type = FeedingTypeEnum.ORAL_FLUIDS;

		const feedingOrErr = Feeding.create(
			null as unknown as DateValue,
			type,
			notes,
		);

		assertEquals(feedingOrErr.isLeft(), true);
		const error = feedingOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("A data e hora da alimentação são obrigatórias")),
			true,
		);
	});

	await t.step("Deve retornar erro se as notas excederem 500 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const notes = "a".repeat(501);
		const type = FeedingTypeEnum.MEDICATIONS;

		const feedingOrErr = Feeding.create(
			dateTime,
			type,
			notes,
		);

		assertEquals(feedingOrErr.isLeft(), true);
		const error = feedingOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("As notas não podem ter mais de 500 caracteres")),
			true,
		);
	});

	await t.step("Deve permitir notas com exatamente 500 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const notes = "b".repeat(500);
		const type = FeedingTypeEnum.IV_FLUIDS;

		const feedingOrErr = Feeding.create(
			dateTime,
			type,
			notes,
		);

		assertEquals(feedingOrErr.isRight(), true);
	});

	await t.step("Deve permitir notas vazias", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const notes = "";
		const type = FeedingTypeEnum.ORAL_FLUIDS;

		const feedingOrErr = Feeding.create(
			dateTime,
			type,
			notes,
		);

		assertEquals(feedingOrErr.isRight(), true);
		const feeding = feedingOrErr.right!;
		assertEquals(feeding.notes, "");
	});

	await t.step("Deve testar diferentes categorias de alimentação", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;
		const notes = "Teste de categorias.";
		const type = FeedingTypeEnum.FEEDING;

		// Test KEEBLE
		const feedingKeebleOrErr = Feeding.create(
			dateTime,
			type,
			notes,
			FeedingCategoryEnum.KEEBLE,
			7,
		);
		assertEquals(feedingKeebleOrErr.isRight(), true);
		assertEquals(feedingKeebleOrErr.right!.feedingCategory, FeedingCategoryEnum.KEEBLE);

		// Test WET
		const feedingWetOrErr = Feeding.create(
			dateTime,
			type,
			notes,
			FeedingCategoryEnum.WET,
			9,
		);
		assertEquals(feedingWetOrErr.isRight(), true);
		assertEquals(feedingWetOrErr.right!.feedingCategory, FeedingCategoryEnum.WET);

		// Test RECOVERY
		const feedingRecoveryOrErr = Feeding.create(
			dateTime,
			type,
			notes,
			FeedingCategoryEnum.RECOVERY,
			6,
		);
		assertEquals(feedingRecoveryOrErr.isRight(), true);
		assertEquals(feedingRecoveryOrErr.right!.feedingCategory, FeedingCategoryEnum.RECOVERY);
	});

	await t.step("Deve validar pontuação de apetite dentro do intervalo válido (0-10)", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;
		const notes = "Teste de pontuação.";
		const type = FeedingTypeEnum.FEEDING;
		const feedingCategory = FeedingCategoryEnum.WET;

		// Test valid scores
		for (let score = 0; score <= 10; score++) {
			const feedingOrErr = Feeding.create(
				dateTime,
				type,
				notes,
				feedingCategory,
				score,
			);
			assertEquals(feedingOrErr.isRight(), true, `Score ${score} should be valid`);
			assertEquals(feedingOrErr.right!.appetiteScore, score);
		}
	});

	await t.step(
		"Deve retornar erro para pontuação de apetite fora do intervalo (< 0 ou > 10)",
		() => {
			const dateTimeOrErr = DateValue.fromString("2024-03-15");
			assertEquals(dateTimeOrErr.isRight(), true);
			const dateTime = dateTimeOrErr.right!;
			const notes = "Teste de pontuação inválida.";
			const type = FeedingTypeEnum.FEEDING;
			const feedingCategory = FeedingCategoryEnum.KEEBLE;

			// Test invalid scores
			const invalidScores = [-1, 11, 15, -5];

			invalidScores.forEach((score) => {
				const feedingOrErr = Feeding.create(
					dateTime,
					type,
					notes,
					feedingCategory,
					score,
				);
				assertEquals(feedingOrErr.isLeft(), true, `Score ${score} should be invalid`);
			});
		},
	);

	await t.step("As propriedades devem ser imutáveis após a criação", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const initialDateTime = dateTimeOrErr.right!;
		const initialNotes = "Dados iniciais.";
		const initialType = FeedingTypeEnum.FEEDING;
		const initialCategory = FeedingCategoryEnum.RECOVERY;
		const initialScore = 8;

		const feedingOrErr = Feeding.create(
			initialDateTime,
			initialType,
			initialNotes,
			initialCategory,
			initialScore,
		);
		assertEquals(feedingOrErr.isRight(), true);
		const feeding = feedingOrErr.right!;

		// A imutabilidade é garantida pelo TypeScript com `readonly`
		// e pela ausência de métodos setters.
		// Este teste verifica se os valores recuperados são os iniciais.
		assertEquals(feeding.dateTime, initialDateTime);
		assertEquals(feeding.type, initialType);
		assertEquals(feeding.notes, initialNotes);
		assertEquals(feeding.feedingCategory, initialCategory);
		assertEquals(feeding.appetiteScore, initialScore);
	});
});
