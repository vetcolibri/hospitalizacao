import { assertEquals } from "@deps/assert";
import { DateValue } from "@shared/date_value.ts";
import { MeasurementValue } from "./measurement_value.ts";
import { MeasurementTypeEnum } from "./measurement_type_enum.ts";
import { ValidationError } from "@shared/validation_error.ts";

Deno.test("MeasurementValue", async (t) => {
	await t.step("Deve criar uma medição válida com todos os campos (string)", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "120";
		const notes = "Frequência cardíaca normal durante o repouso";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
			notes,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.dateTime, dateTime);
		assertEquals(measurement.measurementTypeId, measurementTypeId);
		assertEquals(measurement.value, value);
		assertEquals(measurement.notes, notes);
	});

	await t.step("Deve criar uma medição válida com todos os campos (number)", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = 120;
		const notes = "Frequência cardíaca normal durante o repouso";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
			notes,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.dateTime, dateTime);
		assertEquals(measurement.measurementTypeId, measurementTypeId);
		assertEquals(measurement.value, value);
		assertEquals(measurement.notes, notes);
	});

	await t.step("Deve criar uma medição válida sem notas (string)", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.TEMPERATURE;
		const value = "38.5";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.dateTime, dateTime);
		assertEquals(measurement.measurementTypeId, measurementTypeId);
		assertEquals(measurement.value, value);
		assertEquals(measurement.notes, undefined);
	});

	await t.step("Deve criar uma medição válida sem notas (number)", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.TEMPERATURE;
		const value = 38.5;

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.dateTime, dateTime);
		assertEquals(measurement.measurementTypeId, measurementTypeId);
		assertEquals(measurement.value, value);
		assertEquals(measurement.notes, undefined);
	});

	await t.step("Deve criar medições para diferentes tipos de sinais vitais", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const testCases = [
			{ type: MeasurementTypeEnum.HEART_RATE, value: "85", notes: "Regular rhythm" },
			{ type: MeasurementTypeEnum.RESPIRATORY_RATE, value: "22", notes: "Normal breathing" },
			{ type: MeasurementTypeEnum.SYSTOLIC_BP, value: "140", notes: "Slightly elevated" },
			{ type: MeasurementTypeEnum.DIASTOLIC_BP, value: "90", notes: "Within normal range" },
			{ type: MeasurementTypeEnum.TEMPERATURE, value: "39.2", notes: "Fever present" },
			{ type: MeasurementTypeEnum.OXYGEN_SATURATION, value: "98", notes: "Good oxygenation" },
		];

		testCases.forEach(({ type, value, notes }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				type,
				value,
				notes,
			);
			assertEquals(measurementOrErr.isRight(), true, `Type ${type} should be valid`);
			assertEquals(measurementOrErr.right!.measurementTypeId, type);
			assertEquals(measurementOrErr.right!.value, value);
			assertEquals(measurementOrErr.right!.notes, notes);
		});

		// Test with numeric values
		const numericTestCases = [
			{ type: MeasurementTypeEnum.HEART_RATE, value: 85, notes: "Regular rhythm" },
			{ type: MeasurementTypeEnum.RESPIRATORY_RATE, value: 22, notes: "Normal breathing" },
			{ type: MeasurementTypeEnum.SYSTOLIC_BP, value: 140, notes: "Slightly elevated" },
			{ type: MeasurementTypeEnum.TEMPERATURE, value: 39.2, notes: "Fever present" },
		];

		numericTestCases.forEach(({ type, value, notes }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				type,
				value,
				notes,
			);
			assertEquals(measurementOrErr.isRight(), true, `Numeric type ${type} should be valid`);
			assertEquals(measurementOrErr.right!.measurementTypeId, type);
			assertEquals(measurementOrErr.right!.value, value);
			assertEquals(measurementOrErr.right!.notes, notes);
		});
	});

	await t.step("Deve criar medições para avaliação física", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const testCases = [
			{ type: MeasurementTypeEnum.WEIGHT, value: "25.5", notes: "kg" },
			{
				type: MeasurementTypeEnum.BODY_CONDITION_SCORE,
				value: "4/9",
				notes: "Slightly overweight",
			},
			{ type: MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR, value: "Pink", notes: "Normal color" },
			{ type: MeasurementTypeEnum.CAPILLARY_REFILL_TIME, value: "2", notes: "seconds" },
		];

		testCases.forEach(({ type, value, notes }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				type,
				value,
				notes,
			);
			assertEquals(measurementOrErr.isRight(), true, `Type ${type} should be valid`);
			assertEquals(measurementOrErr.right!.measurementTypeId, type);
			assertEquals(measurementOrErr.right!.value, value);
		});

		// Test with numeric values
		const numericTestCases = [
			{ type: MeasurementTypeEnum.WEIGHT, value: 25.5, notes: "kg" },
			{ type: MeasurementTypeEnum.CAPILLARY_REFILL_TIME, value: 2, notes: "seconds" },
		];

		numericTestCases.forEach(({ type, value, notes }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				type,
				value,
				notes,
			);
			assertEquals(measurementOrErr.isRight(), true, `Numeric type ${type} should be valid`);
			assertEquals(measurementOrErr.right!.measurementTypeId, type);
			assertEquals(measurementOrErr.right!.value, value);
		});
	});

	await t.step("Deve criar medições para avaliação neurológica", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const testCases = [
			{ type: MeasurementTypeEnum.GLASGOW_COMA_SCALE, value: "15", notes: "Alert and responsive" },
			{ type: MeasurementTypeEnum.PUPIL_SIZE_LEFT, value: "3mm", notes: "Normal size" },
			{ type: MeasurementTypeEnum.PUPIL_SIZE_RIGHT, value: "3mm", notes: "Equal to left" },
			{ type: MeasurementTypeEnum.PAIN_SCORE, value: "2/10", notes: "Mild discomfort" },
		];

		testCases.forEach(({ type, value, notes }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				type,
				value,
				notes,
			);
			assertEquals(measurementOrErr.isRight(), true, `Type ${type} should be valid`);
			assertEquals(measurementOrErr.right!.measurementTypeId, type);
			assertEquals(measurementOrErr.right!.value, value);
		});
	});

	await t.step("Deve retornar erro se a data/hora for nula", () => {
		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "120";

		const measurementOrErr = MeasurementValue.create(
			null as unknown as DateValue,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("A data e hora da medição são obrigatórias")),
			true,
		);
	});

	await t.step("Deve retornar erro se o ID do tipo de medição for vazio", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = "";
		const value = "120";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("O ID do tipo de medição é obrigatório")),
			true,
		);
	});

	await t.step("Deve retornar erro se o ID do tipo de medição for apenas espaços em branco", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = "   ";
		const value = "120";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("O ID do tipo de medição é obrigatório")),
			true,
		);
	});

	await t.step("Deve retornar erro se o valor da medição for vazio", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("Invalid input")),
			true,
		);
	});

	await t.step("Deve aceitar valores numéricos válidos", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const testCases = [
			{ type: MeasurementTypeEnum.HEART_RATE, value: 120 },
			{ type: MeasurementTypeEnum.TEMPERATURE, value: 38.5 },
			{ type: MeasurementTypeEnum.WEIGHT, value: 25.75 },
			{ type: MeasurementTypeEnum.GLUCOSE, value: 95.2 },
		];

		testCases.forEach(({ type, value }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				type,
				value,
			);
			assertEquals(measurementOrErr.isRight(), true, `Numeric value ${value} should be valid`);
			assertEquals(measurementOrErr.right!.value, value);
		});
	});

	await t.step("Deve rejeitar valores numéricos inválidos", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const invalidValues = [NaN, Infinity, -Infinity];

		invalidValues.forEach((value) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				MeasurementTypeEnum.HEART_RATE,
				value,
			);
			assertEquals(
				measurementOrErr.isLeft(),
				true,
				`Invalid numeric value ${value} should be rejected`,
			);
		});
	});

	await t.step("Deve retornar erro se o valor da medição for apenas espaços em branco", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.TEMPERATURE;
		const value = "   ";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("Invalid input")),
			true,
		);
	});

	await t.step("Deve retornar erro se o ID do tipo de medição exceder 50 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = "a".repeat(51);
		const value = "120";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) =>
				e.includes("O ID do tipo de medição não pode ter mais de 50 caracteres")
			),
			true,
		);
	});

	await t.step("Deve retornar erro se o valor da medição exceder 100 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "b".repeat(101);

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("Invalid input")),
			true,
		);
	});

	await t.step("Deve retornar erro se as notas excederem 500 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "120";
		const notes = "c".repeat(501);

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
			notes,
		);

		assertEquals(measurementOrErr.isLeft(), true);
		const error = measurementOrErr.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("As notas não podem ter mais de 500 caracteres")),
			true,
		);
	});

	await t.step("Deve permitir ID do tipo de medição com exatamente 50 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = "d".repeat(50);
		const value = "120";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.measurementTypeId.length, 50);
	});

	await t.step("Deve permitir valor da medição com exatamente 100 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "e".repeat(100);

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals((measurement.value as string).length, 100);
	});

	await t.step("Deve permitir notas com exatamente 500 caracteres", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "120";
		const notes = "f".repeat(500);

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
			notes,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.notes!.length, 500);
	});

	await t.step("Deve permitir notas vazias", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const value = "120";
		const notes = "";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
			notes,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.notes, "");
	});

	await t.step("Deve aparar espaços em branco do ID do tipo de medição e valor", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const measurementTypeId = "  HR  ";
		const value = "  120  ";

		const measurementOrErr = MeasurementValue.create(
			dateTime,
			measurementTypeId,
			value,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.measurementTypeId, "HR");
		assertEquals(measurement.value, "120");
	});

	await t.step("Deve manter valores numéricos sem alteração", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const numericValue = 98.6;
		const measurementOrErr = MeasurementValue.create(
			dateTime,
			MeasurementTypeEnum.TEMPERATURE,
			numericValue,
		);

		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;
		assertEquals(measurement.value, numericValue);
		assertEquals(typeof measurement.value, "number");
	});

	await t.step("As propriedades devem ser imutáveis após a criação", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const initialDateTime = dateTimeOrErr.right!;
		const initialMeasurementTypeId = MeasurementTypeEnum.HEART_RATE;
		const initialValue = "120";
		const initialNotes = "Dados iniciais";

		const measurementOrErr = MeasurementValue.create(
			initialDateTime,
			initialMeasurementTypeId,
			initialValue,
			initialNotes,
		);
		assertEquals(measurementOrErr.isRight(), true);
		const measurement = measurementOrErr.right!;

		// A imutabilidade é garantida pelo TypeScript com `readonly`
		// e pela ausência de métodos setters.
		// Este teste verifica se os valores recuperados são os iniciais.
		assertEquals(measurement.dateTime, initialDateTime);
		assertEquals(measurement.measurementTypeId, initialMeasurementTypeId);
		assertEquals(measurement.value, initialValue);
		assertEquals(measurement.notes, initialNotes);
	});

	await t.step("Deve aceitar valores estruturados para pressão arterial", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const testCases = [
			{ id: MeasurementTypeEnum.SYSTOLIC_BP, value: "140", notes: "mmHg" },
			{ id: MeasurementTypeEnum.DIASTOLIC_BP, value: "90", notes: "mmHg" },
		];

		testCases.forEach(({ id, value, notes }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				id,
				value,
				notes,
			);
			assertEquals(measurementOrErr.isRight(), true, `BP measurement ${id} should be valid`);
			assertEquals(measurementOrErr.right!.value, value);
		});
	});

	await t.step("Deve aceitar valores de laboratório", () => {
		const dateTimeOrErr = DateValue.fromString("2024-03-15");
		assertEquals(dateTimeOrErr.isRight(), true);
		const dateTime = dateTimeOrErr.right!;

		const testCases = [
			{ id: MeasurementTypeEnum.GLUCOSE, value: "95", notes: "mg/dL - normal range" },
			{ id: MeasurementTypeEnum.LACTATE, value: "2.1", notes: "mmol/L - slightly elevated" },
			{ id: MeasurementTypeEnum.PCV_HEMATOCRIT, value: "45", notes: "% - normal" },
			{ id: MeasurementTypeEnum.TOTAL_PROTEIN, value: "7.2", notes: "g/dL - normal" },
		];

		testCases.forEach(({ id, value, notes }) => {
			const measurementOrErr = MeasurementValue.create(
				dateTime,
				id,
				value,
				notes,
			);
			assertEquals(measurementOrErr.isRight(), true, `Lab value ${id} should be valid`);
			assertEquals(measurementOrErr.right!.measurementTypeId, id);
			assertEquals(measurementOrErr.right!.value, value);
		});
	});
});
