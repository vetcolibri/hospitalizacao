import { assertEquals } from "@deps/assert";
import { DateValue } from "@shared/date_value.ts";
import { Elimination } from "./elimination.ts";
import { EliminationTypeEnum } from "./elimination_type_enum.ts";
import { ValidationError } from "@shared/validation_error.ts";

Deno.test("Elimination", async (t) => {
	await t.step("Deve criar uma eliminação válida do tipo FECES", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.FECES;
		const aspect = "firm";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;
		assertEquals(elimination.dateTime, dateTime);
		assertEquals(elimination.type, type);
		assertEquals(elimination.aspect, aspect);
	});

	await t.step("Deve criar uma eliminação válida do tipo DIARRHEA", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.DIARRHEA;
		const aspect = "watery with blood";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;
		assertEquals(elimination.dateTime, dateTime);
		assertEquals(elimination.type, type);
		assertEquals(elimination.aspect, aspect);
	});

	await t.step("Deve criar uma eliminação válida do tipo VOMIT", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.VOMIT;
		const aspect = "bilious";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;
		assertEquals(elimination.type, type);
		assertEquals(elimination.aspect, aspect);
	});

	await t.step("Deve criar uma eliminação válida do tipo URINE", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.URINE;
		const aspect = "clear yellow";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;
		assertEquals(elimination.type, type);
		assertEquals(elimination.aspect, aspect);
	});

	await t.step("Deve retornar erro se a data/hora for nula", () => {
		const type = EliminationTypeEnum.FECES;
		const aspect = "normal";

		const eliminationOrErr = Elimination.create(
			null as unknown as DateValue,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isLeft(), true);
		const error = eliminationOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("A data e hora da eliminação são obrigatórias")),
			true,
		);
	});

	await t.step("Deve retornar erro se o aspecto for vazio", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.URINE;
		const aspect = "";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isLeft(), true);
		const error = eliminationOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("O aspecto da eliminação é obrigatório")),
			true,
		);
	});

	await t.step("Deve retornar erro se o aspecto for apenas espaços em branco", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.VOMIT;
		const aspect = "   ";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isLeft(), true);
		const error = eliminationOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("O aspecto da eliminação é obrigatório")),
			true,
		);
	});

	await t.step("Deve retornar erro se o aspecto exceder 200 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.DIARRHEA;
		const aspect = "a".repeat(201);

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isLeft(), true);
		const error = eliminationOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("O aspecto não pode ter mais de 200 caracteres")),
			true,
		);
	});

	await t.step("Deve permitir aspecto com exatamente 200 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.FECES;
		const aspect = "b".repeat(200);

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;
		assertEquals(elimination.aspect.length, 200);
	});

	await t.step("Deve aceitar aspecto com apenas 1 caractere", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.URINE;
		const aspect = "x";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;
		assertEquals(elimination.aspect, "x");
	});

	await t.step("Deve testar todos os tipos de eliminação", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const testCases = [
			{ type: EliminationTypeEnum.FECES, aspect: "firm and well-formed" },
			{ type: EliminationTypeEnum.DIARRHEA, aspect: "liquid with mucus" },
			{ type: EliminationTypeEnum.VOMIT, aspect: "food particles visible" },
			{ type: EliminationTypeEnum.URINE, aspect: "dark yellow color" },
		];

		testCases.forEach(({ type, aspect }) => {
			const eliminationOrErr = Elimination.create(
				dateTime,
				type,
				aspect,
			);
			assertEquals(eliminationOrErr.isRight(), true, `Type ${type} should be valid`);
			assertEquals(eliminationOrErr.right!.type, type);
			assertEquals(eliminationOrErr.right!.aspect, aspect);
		});
	});

	await t.step("Deve aparar espaços em branco do aspecto", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const type = EliminationTypeEnum.FECES;
		const aspect = "  normal with some blood  ";

		const eliminationOrErr = Elimination.create(
			dateTime,
			type,
			aspect,
		);

		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;
		assertEquals(elimination.aspect, "normal with some blood");
	});

	await t.step("As propriedades devem ser imutáveis após a criação", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const initialDateTime = dateTimeOrErr.right!;
		const initialType = EliminationTypeEnum.DIARRHEA;
		const initialAspect = "watery and frequent";

		const eliminationOrErr = Elimination.create(
			initialDateTime,
			initialType,
			initialAspect,
		);
		assertEquals(eliminationOrErr.isRight(), true);
		const elimination = eliminationOrErr.right!;

		// A imutabilidade é garantida pelo TypeScript com `readonly`
		// e pela ausência de métodos setters.
		// Este teste verifica se os valores recuperados são os iniciais.
		assertEquals(elimination.dateTime, initialDateTime);
		assertEquals(elimination.type, initialType);
		assertEquals(elimination.aspect, initialAspect);
	});

	await t.step("Deve permitir aspectos descritivos complexos", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const complexAspects = [
			{
				type: EliminationTypeEnum.FECES,
				aspect: "dark brown, firm consistency, no blood or mucus present",
			},
			{
				type: EliminationTypeEnum.DIARRHEA,
				aspect: "liquid, yellow-green color, contains undigested food particles",
			},
			{
				type: EliminationTypeEnum.VOMIT,
				aspect: "bilious green fluid with foam, no food particles",
			},
			{
				type: EliminationTypeEnum.URINE,
				aspect: "concentrated yellow, strong odor, no blood visible",
			},
		];

		complexAspects.forEach(({ type, aspect }) => {
			const eliminationOrErr = Elimination.create(
				dateTime,
				type,
				aspect,
			);
			assertEquals(eliminationOrErr.isRight(), true, `Complex aspect for ${type} should be valid`);
			assertEquals(eliminationOrErr.right!.aspect, aspect);
		});
	});
});
