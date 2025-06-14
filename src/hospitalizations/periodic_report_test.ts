import { assertEquals } from "@deps/assert";
import { DateValue } from "@shared/date_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { PeriodicReport } from "./periodic_report.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";
import { ValidationError } from "@shared/validation_error.ts";

Deno.test("PeriodicReport", async (t) => {
	await t.step("Deve criar um relatório periódico válido", () => {
		const timestampOrErr = DateValue.fromString("2024-03-15");
		assertEquals(timestampOrErr.isRight(), true);
		const timestamp = timestampOrErr.right!;

		const annotations = "Paciente estável, alimentou-se bem.";
		const consciousness = ConsciousnessStateEnum.AWAKE;
		const id = IdValue.random();

		const reportOrErr = PeriodicReport.create(
			id,
			timestamp,
			consciousness,
			annotations,
		);

		assertEquals(reportOrErr.isRight(), true);
		const report = reportOrErr.right!;
		assertEquals(report.id, id);
		assertEquals(report.timestamp, timestamp);
		assertEquals(report.consciousnessStates, consciousness);
		assertEquals(report.annotations, annotations);
	});

	await t.step("Deve retornar erro se o timestamp for nulo", () => {
		const annotations = "Observações.";
		const consciousness = ConsciousnessStateEnum.ASLEEP;

		const reportOrErr = PeriodicReport.create(
			IdValue.random(),
			null as unknown as DateValue,
			consciousness,
			annotations,
		);

		assertEquals(reportOrErr.isLeft(), true);
		const error = reportOrErr.value as ValidationError;
		assertEquals(error.errors.join("").includes("O timestamp é obrigatório"), true);
	});

	await t.step("Deve retornar erro se as anotações excederem 1000 caracteres", () => {
		const timestampOrErr = DateValue.fromString("2024-03-15");
		assertEquals(timestampOrErr.isRight(), true);
		const timestamp = timestampOrErr.right!;

		const annotations = "a".repeat(1001);
		const consciousness = ConsciousnessStateEnum.UNCONSCIOUS;

		const reportOrErr = PeriodicReport.create(
			IdValue.random(),
			timestamp,
			consciousness,
			annotations,
		);

		assertEquals(reportOrErr.isLeft(), true);
		const error = reportOrErr.value as ValidationError;
		assertEquals(
			error.errors.join("").includes("As anotações não podem ter mais de 1000 caracteres"),
			true,
		);
	});

	await t.step("Deve permitir anotações com exatamente 1000 caracteres", () => {
		const timestampOrErr = DateValue.fromString("2024-03-15");
		assertEquals(timestampOrErr.isRight(), true);
		const timestamp = timestampOrErr.right!;

		const annotations = "b".repeat(1000);
		const consciousness = ConsciousnessStateEnum.AWAKE;

		const reportOrErr = PeriodicReport.create(
			IdValue.random(),
			timestamp,
			consciousness,
			annotations,
		);

		assertEquals(reportOrErr.isRight(), true);
	});

	await t.step("Deve permitir anotações vazias", () => {
		const timestampOrErr = DateValue.fromString("2024-03-15");
		assertEquals(timestampOrErr.isRight(), true);
		const timestamp = timestampOrErr.right!;

		const annotations = "";
		const consciousness = ConsciousnessStateEnum.ASLEEP;

		const reportOrErr = PeriodicReport.create(
			IdValue.random(),
			timestamp,
			consciousness,
			annotations,
		);

		assertEquals(reportOrErr.isRight(), true);
		const report = reportOrErr.right!;
		assertEquals(report.annotations, "");
	});

	await t.step("Deve criar relatórios com diferentes estados de consciência", () => {
		const timestampOrErr = DateValue.fromString("2024-03-15");
		assertEquals(timestampOrErr.isRight(), true);
		const timestamp = timestampOrErr.right!;
		const annotations = "Teste de estados.";

		const reportAwakeOrErr = PeriodicReport.create(
			IdValue.random(),
			timestamp,
			ConsciousnessStateEnum.AWAKE,
			annotations,
		);
		assertEquals(reportAwakeOrErr.isRight(), true);
		assertEquals(reportAwakeOrErr.right!.consciousnessStates, ConsciousnessStateEnum.AWAKE);

		const reportAsleepOrErr = PeriodicReport.create(
			IdValue.random(),
			timestamp,
			ConsciousnessStateEnum.ASLEEP,
			annotations,
		);
		assertEquals(reportAsleepOrErr.isRight(), true);
		assertEquals(reportAsleepOrErr.right!.consciousnessStates, ConsciousnessStateEnum.ASLEEP);

		const reportUnconsciousOrErr = PeriodicReport.create(
			IdValue.random(),
			timestamp,
			ConsciousnessStateEnum.UNCONSCIOUS,
			annotations,
		);
		assertEquals(reportUnconsciousOrErr.isRight(), true);
		assertEquals(
			reportUnconsciousOrErr.right!.consciousnessStates,
			ConsciousnessStateEnum.UNCONSCIOUS,
		);
	});

	await t.step("As propriedades devem ser imutáveis após a criação", () => {
		const timestampOrErr = DateValue.fromString("2024-03-15");
		assertEquals(timestampOrErr.isRight(), true);
		const initialTimestamp = timestampOrErr.right!;
		const initialAnnotations = "Dados iniciais.";
		const initialConsciousness = ConsciousnessStateEnum.AWAKE;
		const initialId = IdValue.random();

		const reportOrErr = PeriodicReport.create(
			initialId,
			initialTimestamp,
			initialConsciousness,
			initialAnnotations,
		);
		assertEquals(reportOrErr.isRight(), true);
		const report = reportOrErr.right!;

		// A imutabilidade é garantida pelo TypeScript com `readonly`
		// e pela ausência de métodos setters.
		// Este teste verifica se os valores recuperados são os iniciais.
		assertEquals(report.id, initialId);
		assertEquals(report.timestamp, initialTimestamp);
		assertEquals(report.consciousnessStates, initialConsciousness);
		assertEquals(report.annotations, initialAnnotations);
	});
});
