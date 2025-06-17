import { assert, assertEquals, assertInstanceOf } from "@deps/assert";
import { EventBus, InMemEventBus } from "@shared/event_bus.ts";
import { InmemIntakeOutputRepository } from "./inmem_intake_output_repository.ts";
import { Context } from "@shared/context.ts";
import { IdValue } from "@shared/id_value.ts";
import { DateValue } from "@shared/date_value.ts";
import { IntakeOutput } from "./intake_output.ts";
import { IntakeOutputService } from "./intake_output_service.ts";
import { ForbiddenError } from "@shared/forbidden_error.ts";
import { Event } from "@shared/event.ts";
import { EventHandler } from "@shared/event_handler.ts";
import { PATIENT_INTAKE_RECORDED_EVENT_NAME } from "./patient_intake_recorded_event.ts";
import { PATIENT_OUTPUT_RECORDED_EVENT_NAME } from "./patient_output_recorded_event.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { FeedingTypeEnum } from "./feeding_type_enum.ts";
import { FeedingCategoryEnum } from "./feeding_category_enum.ts";
import { EliminationTypeEnum } from "./elimination_type_enum.ts";
import { UserRoleEnum } from "@shared/user_role_enum.ts";
import { PatientIntakeRecordedPayload } from "./patient_intake_recorded_event.ts";
import { PatientOutputRecordedPayload } from "./patient_output_recorded_event.ts";

Deno.test("IntakeOutputService.recordIntake", async (t) => {
	await t.step(
		"Deve criar um novo IntakeOutput e registrar entrada para nova hospitalização",
		async () => {
			let eventPublished = false;
			let intakePayload: PatientIntakeRecordedPayload | null = null;
			const publish = <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PATIENT_INTAKE_RECORDED_EVENT_NAME) {
					eventPublished = true;
					intakePayload = evt.payload as PatientIntakeRecordedPayload;
				}
			};

			const eventBus: EventBus = {
				publish,
				publishAll: (...evts: Event<unknown>[]) => {
					evts.forEach((e) => publish(e));
				},
				subscribe: function <T>(_: string, _h: EventHandler<T>): void {},
			};

			const { service, intakeOutputRepository, context } = setupService(
				{ eventBus },
			);

			const hospitalizationId = IdValue.random();
			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				type: FeedingTypeEnum.FEEDING,
				notes: "Pet comeu bem",
				feedingCategory: FeedingCategoryEnum.WET,
				appetiteScore: 8,
			};

			const result = await service.recordIntake(context, request);

			assertEquals(
				result.isRight(),
				true,
				`Expected right, got left: ${JSON.stringify(result.value)}`,
			);
			assertEquals(eventPublished, true, "PatientIntakeRecordedEvent não foi publicado.");

			// Verificar se IntakeOutput foi criado
			const intakeOutputOrErr = await intakeOutputRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(intakeOutputOrErr.isRight(), true);
			const intakeOutput = intakeOutputOrErr.right!;
			assertEquals(intakeOutput.feedings.length, 1);
			assertEquals(intakeOutput.feedings[0].type, FeedingTypeEnum.FEEDING);
			assertEquals(intakeOutput.feedings[0].notes, "Pet comeu bem");

			if (intakePayload) {
				const payload = intakePayload as PatientIntakeRecordedPayload;
				assertEquals(payload.hospitalizationId, hospitalizationId.value);
				assertEquals(payload.type, FeedingTypeEnum.FEEDING);
				assertEquals(payload.feedingCategory, FeedingCategoryEnum.WET);
				assertEquals(payload.appetiteScore, 8);
			} else {
				assert(false, "intakePayload should not be null");
			}
		},
	);

	await t.step(
		"Deve adicionar entrada a IntakeOutput existente",
		async () => {
			const { service, intakeOutputRepository, context } = setupService();

			// Criar IntakeOutput existente
			const hospitalizationId = IdValue.random();
			const existingIntakeOutput = new IntakeOutput.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationId)
				.build().right!;
			await intakeOutputRepository.save(existingIntakeOutput);

			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-02",
				type: FeedingTypeEnum.ORAL_FLUIDS,
				notes: "Fluidos administrados",
			};

			const result = await service.recordIntake(context, request);

			assertEquals(result.isRight(), true);

			const updatedIntakeOutputOrErr = await intakeOutputRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(updatedIntakeOutputOrErr.isRight(), true);
			const updatedIntakeOutput = updatedIntakeOutputOrErr.right!;
			assertEquals(updatedIntakeOutput.feedings.length, 1);
			assertEquals(updatedIntakeOutput.feedings[0].type, FeedingTypeEnum.ORAL_FLUIDS);
		},
	);

	await t.step("Deve retornar erro se o principal não tiver o papel adequado", async () => {
		const { service } = setupService();
		const ctx: Context = {
			principal: "user@domain.com",
			roles: [UserRoleEnum.TRAINEE], // Papel inadequado
		};

		const request = {
			hospitalizationId: IdValue.random().value,
			dateTime: "2024-01-01",
			type: FeedingTypeEnum.FEEDING,
			notes: "Teste",
			feedingCategory: FeedingCategoryEnum.WET,
			appetiteScore: 5,
		};

		const result = await service.recordIntake(ctx, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, ForbiddenError);
	});

	await t.step("Deve retornar erro se os dados forem inválidos", async () => {
		const { service, context } = setupService();

		const request = {
			hospitalizationId: "id-inválido",
			dateTime: "data-inválida",
			type: FeedingTypeEnum.FEEDING,
			notes: "Teste",
			feedingCategory: FeedingCategoryEnum.WET,
			appetiteScore: 5,
		};

		const result = await service.recordIntake(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
	});

	await t.step(
		"Deve retornar erro se tipo FEEDING não tiver categoria e pontuação",
		async () => {
			const { service, context } = setupService();

			const request = {
				hospitalizationId: IdValue.random().value,
				dateTime: "2024-01-01",
				type: FeedingTypeEnum.FEEDING,
				notes: "Alimentação sem detalhes",
				// feedingCategory e appetiteScore omitidos
			};

			const result = await service.recordIntake(context, request);

			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, Array);
		},
	);

	await t.step("Deve permitir VET_ASSISTANT registrar entrada", async () => {
		const { service, context } = setupService();
		const assistantContext: Context = {
			principal: "assistant@domain.com",
			roles: [UserRoleEnum.VET_ASSISTANT],
		};

		const request = {
			hospitalizationId: IdValue.random().value,
			dateTime: "2024-01-01",
			type: FeedingTypeEnum.ORAL_FLUIDS,
			notes: "Fluidos pelo assistente",
		};

		const result = await service.recordIntake(assistantContext, request);

		assertEquals(result.isRight(), true);
	});
});

Deno.test("IntakeOutputService.recordOutput", async (t) => {
	await t.step(
		"Deve criar um novo IntakeOutput e registrar eliminação para nova hospitalização",
		async () => {
			let eventPublished = false;
			let outputPayload: PatientOutputRecordedPayload | null = null;
			const publish = <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PATIENT_OUTPUT_RECORDED_EVENT_NAME) {
					eventPublished = true;
					outputPayload = evt.payload as PatientOutputRecordedPayload;
				}
			};

			const eventBus: EventBus = {
				publish,
				publishAll: (...evts: Event<unknown>[]) => {
					evts.forEach((e) => publish(e));
				},
				subscribe: function <T>(_: string, _h: EventHandler<T>): void {},
			};

			const { service, intakeOutputRepository, context } = setupService(
				{ eventBus },
			);

			const hospitalizationId = IdValue.random();
			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				type: EliminationTypeEnum.FECES,
				aspect: "firm",
			};

			const result = await service.recordOutput(context, request);

			assertEquals(
				result.isRight(),
				true,
				`Expected right, got left: ${JSON.stringify(result.value)}`,
			);
			assertEquals(eventPublished, true, "PatientOutputRecordedEvent não foi publicado.");

			// Verificar se IntakeOutput foi criado
			const intakeOutputOrErr = await intakeOutputRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(intakeOutputOrErr.isRight(), true);
			const intakeOutput = intakeOutputOrErr.right!;
			assertEquals(intakeOutput.eliminations.length, 1);
			assertEquals(intakeOutput.eliminations[0].type, EliminationTypeEnum.FECES);
			assertEquals(intakeOutput.eliminations[0].aspect, "firm");

			if (outputPayload) {
				const payload = outputPayload as PatientOutputRecordedPayload;
				assertEquals(payload.hospitalizationId, hospitalizationId.value);
				assertEquals(payload.type, EliminationTypeEnum.FECES);
				assertEquals(payload.aspect, "firm");
			} else {
				assert(false, "outputPayload should not be null");
			}
		},
	);

	await t.step(
		"Deve adicionar eliminação a IntakeOutput existente",
		async () => {
			const { service, intakeOutputRepository, context } = setupService();

			// Criar IntakeOutput existente
			const hospitalizationId = IdValue.random();
			const existingIntakeOutput = new IntakeOutput.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationId)
				.build().right!;
			await intakeOutputRepository.save(existingIntakeOutput);

			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-02",
				type: EliminationTypeEnum.URINE,
				aspect: "yellow clear",
			};

			const result = await service.recordOutput(context, request);

			assertEquals(result.isRight(), true);

			const updatedIntakeOutputOrErr = await intakeOutputRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(updatedIntakeOutputOrErr.isRight(), true);
			const updatedIntakeOutput = updatedIntakeOutputOrErr.right!;
			assertEquals(updatedIntakeOutput.eliminations.length, 1);
			assertEquals(updatedIntakeOutput.eliminations[0].type, EliminationTypeEnum.URINE);
			assertEquals(updatedIntakeOutput.eliminations[0].aspect, "yellow clear");
		},
	);

	await t.step("Deve retornar erro se o principal não tiver o papel adequado", async () => {
		const { service } = setupService();
		const ctx: Context = {
			principal: "user@domain.com",
			roles: [UserRoleEnum.TRAINEE], // Papel inadequado
		};

		const request = {
			hospitalizationId: IdValue.random().value,
			dateTime: "2024-01-01",
			type: EliminationTypeEnum.VOMIT,
			aspect: "bilious",
		};

		const result = await service.recordOutput(ctx, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, ForbiddenError);
	});

	await t.step("Deve retornar erro se os dados forem inválidos", async () => {
		const { service, context } = setupService();

		const request = {
			hospitalizationId: "id-inválido",
			dateTime: "data-inválida",
			type: EliminationTypeEnum.DIARRHEA,
			aspect: "", // Aspecto vazio
		};

		const result = await service.recordOutput(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
	});

	await t.step("Deve permitir VET_ASSISTANT registrar eliminação", async () => {
		const { service, context } = setupService();
		const assistantContext: Context = {
			principal: "assistant@domain.com",
			roles: [UserRoleEnum.VET_ASSISTANT],
		};

		const request = {
			hospitalizationId: IdValue.random().value,
			dateTime: "2024-01-01",
			type: EliminationTypeEnum.FECES,
			aspect: "normal pelo assistente",
		};

		const result = await service.recordOutput(assistantContext, request);

		assertEquals(result.isRight(), true);
	});

	await t.step("Deve registrar diferentes tipos de eliminação", async () => {
		const { service, intakeOutputRepository, context } = setupService();

		const hospitalizationId = IdValue.random();
		const testCases = [
			{ type: EliminationTypeEnum.FECES, aspect: "firm brown" },
			{ type: EliminationTypeEnum.DIARRHEA, aspect: "watery yellow" },
			{ type: EliminationTypeEnum.VOMIT, aspect: "bilious green" },
			{ type: EliminationTypeEnum.URINE, aspect: "clear yellow" },
		];

		for (const testCase of testCases) {
			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				type: testCase.type,
				aspect: testCase.aspect,
			};

			const result = await service.recordOutput(context, request);
			assertEquals(result.isRight(), true, `Failed for type ${testCase.type}`);
		}

		// Verificar que todas as eliminações foram registradas
		const intakeOutputOrErr = await intakeOutputRepository.findByHospitalizationId(
			hospitalizationId,
		);
		assertEquals(intakeOutputOrErr.isRight(), true);
		assertEquals(intakeOutputOrErr.right!.eliminations.length, testCases.length);
	});
});

Deno.test("IntakeOutputService - Cenários Integrados", async (t) => {
	await t.step("Deve registrar entradas e eliminações no mesmo IntakeOutput", async () => {
		const { service, intakeOutputRepository, context } = setupService();

		const hospitalizationId = IdValue.random();

		// Registrar entrada
		const intakeRequest = {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			type: FeedingTypeEnum.FEEDING,
			notes: "Primeira refeição",
			feedingCategory: FeedingCategoryEnum.WET,
			appetiteScore: 7,
		};

		const intakeResult = await service.recordIntake(context, intakeRequest);
		assertEquals(intakeResult.isRight(), true);

		// Registrar eliminação
		const outputRequest = {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			type: EliminationTypeEnum.FECES,
			aspect: "normal",
		};

		const outputResult = await service.recordOutput(context, outputRequest);
		assertEquals(outputResult.isRight(), true);

		// Verificar que ambos estão no mesmo IntakeOutput
		const intakeOutputOrErr = await intakeOutputRepository.findByHospitalizationId(
			hospitalizationId,
		);
		assertEquals(intakeOutputOrErr.isRight(), true);
		const intakeOutput = intakeOutputOrErr.right!;
		assertEquals(intakeOutput.feedings.length, 1);
		assertEquals(intakeOutput.eliminations.length, 1);
	});

	await t.step("Deve registrar múltiplas entradas de diferentes tipos", async () => {
		const { service, intakeOutputRepository, context } = setupService();

		const hospitalizationId = IdValue.random();
		const feedingTypes = [
			{ type: FeedingTypeEnum.ORAL_FLUIDS, notes: "Fluidos orais" },
			{ type: FeedingTypeEnum.IV_FLUIDS, notes: "Fluidos IV" },
			{ type: FeedingTypeEnum.MEDICATIONS, notes: "Medicação" },
		];

		for (const feeding of feedingTypes) {
			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				type: feeding.type,
				notes: feeding.notes,
			};

			const result = await service.recordIntake(context, request);
			assertEquals(result.isRight(), true, `Failed for type ${feeding.type}`);
		}

		// Adicionar uma refeição completa
		const fullFeedingRequest = {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			type: FeedingTypeEnum.FEEDING,
			notes: "Refeição completa",
			feedingCategory: FeedingCategoryEnum.RECOVERY,
			appetiteScore: 9,
		};

		const fullFeedingResult = await service.recordIntake(context, fullFeedingRequest);
		assertEquals(fullFeedingResult.isRight(), true);

		// Verificar todos os registros
		const intakeOutputOrErr = await intakeOutputRepository.findByHospitalizationId(
			hospitalizationId,
		);
		assertEquals(intakeOutputOrErr.isRight(), true);
		const intakeOutput = intakeOutputOrErr.right!;
		assertEquals(intakeOutput.feedings.length, feedingTypes.length + 1);

		// Verificar que a refeição completa tem categoria e pontuação
		const fullFeeding = intakeOutput.feedings.find((f) => f.type === FeedingTypeEnum.FEEDING);
		assertEquals(fullFeeding?.feedingCategory, FeedingCategoryEnum.RECOVERY);
		assertEquals(fullFeeding?.appetiteScore, 9);
	});

	await t.step("Deve publicar múltiplos eventos em sequência", async () => {
		let intakeEventsCount = 0;
		let outputEventsCount = 0;
		const eventBus: EventBus = {
			publish: <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PATIENT_INTAKE_RECORDED_EVENT_NAME) {
					intakeEventsCount++;
				}
				if (evt.header("EventName") === PATIENT_OUTPUT_RECORDED_EVENT_NAME) {
					outputEventsCount++;
				}
			},
			publishAll: (...evts: Event<unknown>[]) => evts.forEach((e) => eventBus.publish(e)),
			subscribe: () => {},
		};

		const { service, context } = setupService({ eventBus });

		const hospitalizationId = IdValue.random();

		// Registrar múltiplas entradas e eliminações
		await service.recordIntake(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			type: FeedingTypeEnum.ORAL_FLUIDS,
			notes: "Primeira entrada",
		});

		await service.recordOutput(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			type: EliminationTypeEnum.URINE,
			aspect: "primeira eliminação",
		});

		await service.recordIntake(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-02",
			type: FeedingTypeEnum.MEDICATIONS,
			notes: "Segunda entrada",
		});

		assertEquals(intakeEventsCount, 2);
		assertEquals(outputEventsCount, 1);
	});
});

function setupService(
	opts?: Partial<{
		eventBus: EventBus;
		intakeOutputRepository: InmemIntakeOutputRepository;
	}>,
) {
	const eventBus = opts?.eventBus ?? new InMemEventBus();
	const intakeOutputRepository = opts?.intakeOutputRepository ??
		new InmemIntakeOutputRepository();

	const service = new IntakeOutputService(
		eventBus,
		intakeOutputRepository,
	);

	return {
		service,
		eventBus,
		intakeOutputRepository,
		context: {
			principal: "user@domain.com",
			roles: [UserRoleEnum.MED_VET],
		} as Context,
	};
}
