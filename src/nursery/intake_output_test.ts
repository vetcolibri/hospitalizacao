import { assertEquals, assertInstanceOf } from "@deps/assert";
import { DateValue } from "@shared/date_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { IntakeOutput } from "./intake_output.ts";
import { Feeding } from "./feeding.ts";
import { Elimination } from "./elimination.ts";
import { FeedingTypeEnum } from "./feeding_type_enum.ts";
import { FeedingCategoryEnum } from "./feeding_category_enum.ts";
import { EliminationTypeEnum } from "./elimination_type_enum.ts";
import { ValidationError } from "@shared/validation_error.ts";
import {
	PATIENT_INTAKE_RECORDED_EVENT_NAME,
	PatientIntakeRecordedPayload,
} from "./patient_intake_recorded_event.ts";
import {
	PATIENT_OUTPUT_RECORDED_EVENT_NAME,
	PatientOutputRecordedPayload,
} from "./patient_output_recorded_event.ts";

Deno.test("IntakeOutput", async (t) => {
	await t.step("Deve criar um IntakeOutput válido usando o Builder", () => {
		const id = IdValue.random();
		const hospitalizationId = IdValue.random();

		const intakeOutputOrErr = new IntakeOutput.Builder()
			.withId(id)
			.withHospitalizationId(hospitalizationId)
			.build();

		assertEquals(intakeOutputOrErr.isRight(), true);
		const intakeOutput = intakeOutputOrErr.right!;
		assertEquals(intakeOutput.id, id);
		assertEquals(intakeOutput.hospitalizationId, hospitalizationId);
		assertEquals(intakeOutput.feedings.length, 0);
		assertEquals(intakeOutput.eliminations.length, 0);
	});

	await t.step("Deve retornar erro se o ID da hospitalização não for fornecido no Builder", () => {
		const id = IdValue.random();

		const intakeOutputOrErr = new IntakeOutput.Builder()
			.withId(id)
			.build();

		assertEquals(intakeOutputOrErr.isLeft(), true);
		assertInstanceOf(intakeOutputOrErr.value, ValidationError);
	});

	await t.step("Deve adicionar uma alimentação e gerar evento", () => {
		const intakeOutput = createValidIntakeOutput();
		const feeding = createValidFeeding();

		const result = intakeOutput.addFeeding(feeding);

		assertEquals(result.isRight(), true);
		assertEquals(intakeOutput.feedings.length, 1);
		assertEquals(intakeOutput.feedings[0], feeding);

		const events = intakeOutput.clearUncommitedEvents();
		assertEquals(events.length, 1);
		assertEquals(events[0].header("EventName"), PATIENT_INTAKE_RECORDED_EVENT_NAME);

		const payload = events[0].payload as PatientIntakeRecordedPayload;
		assertEquals(payload.intakeOutputId, intakeOutput.id.value);
		assertEquals(payload.hospitalizationId, intakeOutput.hospitalizationId.value);
		assertEquals(payload.dateTime, feeding.dateTime.value);
		assertEquals(payload.type, feeding.type);
		assertEquals(payload.notes, feeding.notes);
	});

	await t.step("Deve adicionar uma eliminação e gerar evento", () => {
		const intakeOutput = createValidIntakeOutput();
		const elimination = createValidElimination();

		const result = intakeOutput.addElimination(elimination);

		assertEquals(result.isRight(), true);
		assertEquals(intakeOutput.eliminations.length, 1);
		assertEquals(intakeOutput.eliminations[0], elimination);

		const events = intakeOutput.clearUncommitedEvents();
		assertEquals(events.length, 1);
		assertEquals(events[0].header("EventName"), PATIENT_OUTPUT_RECORDED_EVENT_NAME);

		const payload = events[0].payload as PatientOutputRecordedPayload;
		assertEquals(payload.intakeOutputId, intakeOutput.id.value);
		assertEquals(payload.hospitalizationId, intakeOutput.hospitalizationId.value);
		assertEquals(payload.dateTime, elimination.dateTime.value);
		assertEquals(payload.type, elimination.type);
		assertEquals(payload.aspect, elimination.aspect);
	});

	await t.step("Deve adicionar múltiplas alimentações", () => {
		const intakeOutput = createValidIntakeOutput();

		const feeding1 = Feeding.create(
			DateValue.fromString("2024-03-15").right!,
			FeedingTypeEnum.FEEDING,
			"Primeira alimentação",
			FeedingCategoryEnum.WET,
			8,
		).right!;

		const feeding2 = Feeding.create(
			DateValue.fromString("2024-03-16").right!,
			FeedingTypeEnum.ORAL_FLUIDS,
			"Fluidos orais",
		).right!;

		intakeOutput.addFeeding(feeding1);
		intakeOutput.addFeeding(feeding2);

		assertEquals(intakeOutput.feedings.length, 2);

		const events = intakeOutput.clearUncommitedEvents();
		assertEquals(events.length, 2);
	});

	await t.step("Deve adicionar múltiplas eliminações", () => {
		const intakeOutput = createValidIntakeOutput();

		const elimination1 = Elimination.create(
			DateValue.fromString("2024-03-15").right!,
			EliminationTypeEnum.FECES,
			"Normal",
		).right!;

		const elimination2 = Elimination.create(
			DateValue.fromString("2024-03-16").right!,
			EliminationTypeEnum.URINE,
			"Amarelo claro",
		).right!;

		intakeOutput.addElimination(elimination1);
		intakeOutput.addElimination(elimination2);

		assertEquals(intakeOutput.eliminations.length, 2);

		const events = intakeOutput.clearUncommitedEvents();
		assertEquals(events.length, 2);
	});

	await t.step("Deve ordenar alimentações por data descendente", () => {
		const intakeOutput = createValidIntakeOutput();

		const feeding1 = Feeding.create(
			DateValue.fromString("2024-03-15").right!,
			FeedingTypeEnum.ORAL_FLUIDS,
			"Primeira alimentação",
		).right!;

		const feeding2 = Feeding.create(
			DateValue.fromString("2024-03-17").right!,
			FeedingTypeEnum.IV_FLUIDS,
			"Terceira alimentação",
		).right!;

		const feeding3 = Feeding.create(
			DateValue.fromString("2024-03-16").right!,
			FeedingTypeEnum.MEDICATIONS,
			"Segunda alimentação",
		).right!;

		intakeOutput.addFeeding(feeding1);
		intakeOutput.addFeeding(feeding2);
		intakeOutput.addFeeding(feeding3);

		const sortedFeedings = intakeOutput.feedings;
		assertEquals(sortedFeedings.length, 3);
		assertEquals(sortedFeedings[0].notes, "Terceira alimentação"); // 2024-03-17
		assertEquals(sortedFeedings[1].notes, "Segunda alimentação"); // 2024-03-16
		assertEquals(sortedFeedings[2].notes, "Primeira alimentação"); // 2024-03-15
	});

	await t.step("Deve ordenar eliminações por data descendente", () => {
		const intakeOutput = createValidIntakeOutput();

		const elimination1 = Elimination.create(
			DateValue.fromString("2024-03-15").right!,
			EliminationTypeEnum.FECES,
			"Primeira eliminação",
		).right!;

		const elimination2 = Elimination.create(
			DateValue.fromString("2024-03-17").right!,
			EliminationTypeEnum.URINE,
			"Terceira eliminação",
		).right!;

		const elimination3 = Elimination.create(
			DateValue.fromString("2024-03-16").right!,
			EliminationTypeEnum.VOMIT,
			"Segunda eliminação",
		).right!;

		intakeOutput.addElimination(elimination1);
		intakeOutput.addElimination(elimination2);
		intakeOutput.addElimination(elimination3);

		const sortedEliminations = intakeOutput.eliminations;
		assertEquals(sortedEliminations.length, 3);
		assertEquals(sortedEliminations[0].aspect, "Terceira eliminação"); // 2024-03-17
		assertEquals(sortedEliminations[1].aspect, "Segunda eliminação"); // 2024-03-16
		assertEquals(sortedEliminations[2].aspect, "Primeira eliminação"); // 2024-03-15
	});

	await t.step("Deve retornar cópias das listas para evitar mutação externa", () => {
		const intakeOutput = createValidIntakeOutput();
		const feeding = createValidFeeding();
		const elimination = createValidElimination();

		intakeOutput.addFeeding(feeding);
		intakeOutput.addElimination(elimination);

		const feedingsList1 = intakeOutput.feedings;
		const feedingsList2 = intakeOutput.feedings;
		const eliminationsList1 = intakeOutput.eliminations;
		const eliminationsList2 = intakeOutput.eliminations;

		// Listas diferentes (novas instâncias)
		assertEquals(feedingsList1 !== feedingsList2, true);
		assertEquals(eliminationsList1 !== eliminationsList2, true);

		// Mas com o mesmo conteúdo
		assertEquals(feedingsList1.length, feedingsList2.length);
		assertEquals(eliminationsList1.length, eliminationsList2.length);
	});

	await t.step("Deve limpar eventos não commitados", () => {
		const intakeOutput = createValidIntakeOutput();
		const feeding = createValidFeeding();

		intakeOutput.addFeeding(feeding);

		const events1 = intakeOutput.clearUncommitedEvents();
		assertEquals(events1.length, 1);

		const events2 = intakeOutput.clearUncommitedEvents();
		assertEquals(events2.length, 0);
	});

	await t.step("Deve criar um clone sem eventos não commitados", () => {
		const intakeOutput = createValidIntakeOutput();
		const feeding = createValidFeeding();
		const elimination = createValidElimination();

		intakeOutput.addFeeding(feeding);
		intakeOutput.addElimination(elimination);

		// Verificar que há eventos antes do clone
		const eventsBeforeClone = intakeOutput.clearUncommitedEvents();
		assertEquals(eventsBeforeClone.length, 2);

		// Adicionar mais um evento
		intakeOutput.addFeeding(feeding);

		const cloned = intakeOutput.clone();

		// Clone deve ter os mesmos dados
		assertEquals(cloned.id.value, intakeOutput.id.value);
		assertEquals(cloned.hospitalizationId.value, intakeOutput.hospitalizationId.value);
		assertEquals(cloned.feedings.length, intakeOutput.feedings.length);
		assertEquals(cloned.eliminations.length, intakeOutput.eliminations.length);

		// Mas não deve ter eventos não commitados
		const clonedEvents = cloned.clearUncommitedEvents();
		assertEquals(clonedEvents.length, 0);
	});

	await t.step(
		"Deve criar IntakeOutput com alimentações e eliminações iniciais usando Builder",
		() => {
			const id = IdValue.random();
			const hospitalizationId = IdValue.random();
			const feeding = createValidFeeding();
			const elimination = createValidElimination();

			const intakeOutputOrErr = new IntakeOutput.Builder()
				.withId(id)
				.withHospitalizationId(hospitalizationId)
				.withFeedings([feeding])
				.withEliminations([elimination])
				.build();

			assertEquals(intakeOutputOrErr.isRight(), true);
			const intakeOutput = intakeOutputOrErr.right!;
			assertEquals(intakeOutput.feedings.length, 1);
			assertEquals(intakeOutput.eliminations.length, 1);
			assertEquals(intakeOutput.feedings[0], feeding);
			assertEquals(intakeOutput.eliminations[0], elimination);
		},
	);

	await t.step("Deve reconstruir IntakeOutput usando rebuild", () => {
		const id = IdValue.random();
		const hospitalizationId = IdValue.random();
		const feeding = createValidFeeding();
		const elimination = createValidElimination();

		const intakeOutput = new IntakeOutput.Builder()
			.withId(id)
			.withHospitalizationId(hospitalizationId)
			.withFeedings([feeding])
			.withEliminations([elimination])
			.rebuild();

		assertEquals(intakeOutput.id, id);
		assertEquals(intakeOutput.hospitalizationId, hospitalizationId);
		assertEquals(intakeOutput.feedings.length, 1);
		assertEquals(intakeOutput.eliminations.length, 1);

		// Rebuild não deve gerar eventos
		const events = intakeOutput.clearUncommitedEvents();
		assertEquals(events.length, 0);
	});

	await t.step("Deve gerar eventos com payload completo para alimentação tipo FEEDING", () => {
		const intakeOutput = createValidIntakeOutput();
		const feeding = Feeding.create(
			DateValue.fromString("2024-03-15").right!,
			FeedingTypeEnum.FEEDING,
			"Alimentação completa",
			FeedingCategoryEnum.RECOVERY,
			9,
		).right!;

		intakeOutput.addFeeding(feeding);

		const events = intakeOutput.clearUncommitedEvents();
		assertEquals(events.length, 1);

		const payload = events[0].payload as PatientIntakeRecordedPayload;
		assertEquals(payload.feedingCategory, FeedingCategoryEnum.RECOVERY);
		assertEquals(payload.appetiteScore, 9);
		assertEquals(payload.type, FeedingTypeEnum.FEEDING);
		assertEquals(payload.notes, "Alimentação completa");
	});

	await t.step("Deve gerar eventos com payload para alimentação sem categoria e pontuação", () => {
		const intakeOutput = createValidIntakeOutput();
		const feeding = Feeding.create(
			DateValue.fromString("2024-03-15").right!,
			FeedingTypeEnum.ORAL_FLUIDS,
			"Apenas fluidos",
		).right!;

		intakeOutput.addFeeding(feeding);

		const events = intakeOutput.clearUncommitedEvents();
		assertEquals(events.length, 1);

		const payload = events[0].payload as PatientIntakeRecordedPayload;
		assertEquals(payload.feedingCategory, undefined);
		assertEquals(payload.appetiteScore, undefined);
		assertEquals(payload.type, FeedingTypeEnum.ORAL_FLUIDS);
	});

	await t.step("Deve manter imutabilidade das propriedades do agregado", () => {
		const id = IdValue.random();
		const hospitalizationId = IdValue.random();

		const intakeOutput = new IntakeOutput.Builder()
			.withId(id)
			.withHospitalizationId(hospitalizationId)
			.build().right!;

		// As propriedades são readonly e não podem ser modificadas
		assertEquals(intakeOutput.id, id);
		assertEquals(intakeOutput.hospitalizationId, hospitalizationId);

		// Adicionar itens não deve afetar as propriedades básicas
		intakeOutput.addFeeding(createValidFeeding());
		assertEquals(intakeOutput.id, id);
		assertEquals(intakeOutput.hospitalizationId, hospitalizationId);
	});
});

function createValidIntakeOutput(): IntakeOutput {
	return new IntakeOutput.Builder()
		.withId(IdValue.random())
		.withHospitalizationId(IdValue.random())
		.build().right!;
}

function createValidFeeding(): Feeding {
	return Feeding.create(
		DateValue.fromString("2024-03-15").right!,
		FeedingTypeEnum.ORAL_FLUIDS,
		"Alimentação de teste",
	).right!;
}

function createValidElimination(): Elimination {
	return Elimination.create(
		DateValue.fromString("2024-03-15").right!,
		EliminationTypeEnum.FECES,
		"Normal",
	).right!;
}
