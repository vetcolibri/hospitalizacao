import { assert, assertEquals, assertInstanceOf } from "@deps/assert";
import { EventBus, InMemEventBus } from "@shared/event_bus.ts";
import { InmemFlowSheetRecordRepository } from "./inmem_flowsheet_record_repository.ts";
import { Context } from "@shared/context.ts";
import { IdValue } from "@shared/id_value.ts";
import { DateValue } from "@shared/date_value.ts";
import { FlowSheetRecord } from "./flowsheet_record.ts";
import { FlowSheetService } from "./flowsheet_service.ts";
import { ForbiddenError } from "@shared/forbidden_error.ts";
import { Event } from "@shared/event.ts";
import { EventHandler } from "@shared/event_handler.ts";
import { PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME } from "./patient_measurements_recorded_event.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { MeasurementTypeEnum } from "./measurement_type_enum.ts";
import { UserRoleEnum } from "@shared/user_role_enum.ts";
import { PatientMeasurementsRecordedPayload } from "./patient_measurements_recorded_event.ts";
import { RoundPlan } from "./round_plan.ts";

Deno.test("FlowSheetService.recordMedicalRound", async (t) => {
	await t.step(
		"Deve criar um novo FlowSheetRecord e registrar ronda médica para nova hospitalização",
		async () => {
			let eventPublished = false;
			let measurementPayload: PatientMeasurementsRecordedPayload | null = null;
			const publish = <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME) {
					eventPublished = true;
					measurementPayload = evt.payload as PatientMeasurementsRecordedPayload;
				}
			};

			const eventBus: EventBus = {
				publish,
				publishAll: (...evts: Event<unknown>[]) => {
					evts.forEach((e) => publish(e));
				},
				subscribe: function <T>(_: string, _h: EventHandler<T>): void {},
			};

			const { service, flowSheetRecordRepository, context } = setupService(
				{ eventBus },
			);

			const hospitalizationId = IdValue.random();
			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				roundType: "STANDARD_VITALS",
				measurements: [
					{
						measurementTypeId: MeasurementTypeEnum.HEART_RATE,
						value: "85",
						notes: "Regular rhythm",
					},
					{ measurementTypeId: MeasurementTypeEnum.RESPIRATORY_RATE, value: "22", notes: "Normal" },
					{
						measurementTypeId: MeasurementTypeEnum.TEMPERATURE,
						value: "38.5",
						notes: "Slight fever",
					},
					{
						measurementTypeId: MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR,
						value: "Pink",
						notes: "Normal",
					},
					{
						measurementTypeId: MeasurementTypeEnum.CAPILLARY_REFILL_TIME,
						value: "2",
						notes: "seconds",
					},
				],
			};

			const result = await service.recordMedicalRound(context, request);

			assertEquals(
				result.isRight(),
				true,
				`Expected right, got left: ${JSON.stringify(result.value)}`,
			);
			assertEquals(eventPublished, true, "PatientMeasurementsRecordedEvent não foi publicado.");

			// Verificar se FlowSheetRecord foi criado
			const flowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(flowSheetRecordOrErr.isRight(), true);
			const flowSheetRecord = flowSheetRecordOrErr.right!;
			assertEquals(flowSheetRecord.measurements.length, 5);

			if (measurementPayload) {
				const payload = measurementPayload as PatientMeasurementsRecordedPayload;
				assertEquals(payload.hospitalizationId, hospitalizationId.value);
				assertEquals(payload.recordingType, "MEDICAL_ROUND");
				assertEquals(payload.roundType, "STANDARD_VITALS");
				assertEquals(payload.measurements.length, 5);
				assertEquals(payload.totalMeasurementsInRecord, 5);
			} else {
				assert(false, "measurementPayload should not be null");
			}
		},
	);

	await t.step(
		"Deve adicionar ronda médica a FlowSheetRecord existente",
		async () => {
			const { service, flowSheetRecordRepository, context } = setupService();

			// Criar FlowSheetRecord existente
			const hospitalizationId = IdValue.random();
			const existingFlowSheetRecord = new FlowSheetRecord.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationId)
				.build().right!;
			await flowSheetRecordRepository.save(existingFlowSheetRecord);

			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-02",
				roundType: "COMPREHENSIVE",
				measurements: [
					{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "90" },
					{ measurementTypeId: MeasurementTypeEnum.RESPIRATORY_RATE, value: "25" },
					{ measurementTypeId: MeasurementTypeEnum.SYSTOLIC_BP, value: "140" },
					{ measurementTypeId: MeasurementTypeEnum.DIASTOLIC_BP, value: "90" },
					{ measurementTypeId: MeasurementTypeEnum.TEMPERATURE, value: "39.0" },
					{ measurementTypeId: MeasurementTypeEnum.OXYGEN_SATURATION, value: "98" },
					{ measurementTypeId: MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR, value: "Pink" },
					{ measurementTypeId: MeasurementTypeEnum.CAPILLARY_REFILL_TIME, value: "2" },
					{ measurementTypeId: MeasurementTypeEnum.PAIN_SCORE, value: "3" },
					{ measurementTypeId: MeasurementTypeEnum.WEIGHT, value: "25.5" },
				],
			};

			const result = await service.recordMedicalRound(context, request);

			assertEquals(result.isRight(), true);

			const updatedFlowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(updatedFlowSheetRecordOrErr.isRight(), true);
			const updatedFlowSheetRecord = updatedFlowSheetRecordOrErr.right!;
			assertEquals(updatedFlowSheetRecord.measurements.length, 10);
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
			roundType: "STANDARD_VITALS",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "85" },
			],
		};

		const result = await service.recordMedicalRound(ctx, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, ForbiddenError);
	});

	await t.step("Deve retornar erro se os dados forem inválidos", async () => {
		const { service, context } = setupService();

		const request = {
			hospitalizationId: "id-inválido",
			dateTime: "data-inválida",
			roundType: "STANDARD_VITALS",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "85" },
			],
		};

		const result = await service.recordMedicalRound(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
	});

	await t.step("Deve retornar erro se medições obrigatórias estiverem em falta", async () => {
		const { service, context } = setupService();

		const request = {
			hospitalizationId: IdValue.random().value,
			dateTime: "2024-01-01",
			roundType: "STANDARD_VITALS",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "85" },
				// Faltam outras medições obrigatórias
			],
		};

		const result = await service.recordMedicalRound(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
		const errors = result.value as ValidationError[];
		assertEquals(
			errors.some((e) => e.errors.some((msg) => msg.includes("Medições obrigatórias em falta"))),
			true,
		);
	});

	await t.step("Deve permitir VET_ASSISTANT registrar ronda médica", async () => {
		const { service, context } = setupService();
		const assistantContext: Context = {
			principal: "assistant@domain.com",
			roles: [UserRoleEnum.VET_ASSISTANT],
		};

		const request = {
			hospitalizationId: IdValue.random().value,
			dateTime: "2024-01-01",
			roundType: "STANDARD_VITALS",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "85" },
				{ measurementTypeId: MeasurementTypeEnum.RESPIRATORY_RATE, value: "22" },
				{ measurementTypeId: MeasurementTypeEnum.TEMPERATURE, value: "38.5" },
				{ measurementTypeId: MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR, value: "Pink" },
				{ measurementTypeId: MeasurementTypeEnum.CAPILLARY_REFILL_TIME, value: "2" },
			],
		};

		const result = await service.recordMedicalRound(assistantContext, request);

		assertEquals(result.isRight(), true);
	});

	await t.step("Deve validar diferentes tipos de ronda médica", async () => {
		const { service, context } = setupService();

		const roundTypes = ["COMPREHENSIVE", "NEUROLOGICAL", "POST_OPERATIVE", "ICU"];

		for (const roundType of roundTypes) {
			const hospitalizationId = IdValue.random();
			const requiredMeasurements = RoundPlan.getMeasurementsForRound(roundType);

			const measurements = requiredMeasurements.map((measurementTypeId) => ({
				measurementTypeId,
				value: "100", // Valor genérico para teste
				notes: `Test for ${roundType}`,
			}));

			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				roundType,
				measurements,
			};

			const result = await service.recordMedicalRound(context, request);

			assertEquals(result.isRight(), true, `Failed for round type ${roundType}`);
		}
	});
});

Deno.test("FlowSheetService.recordContinuousMeasurements", async (t) => {
	await t.step(
		"Deve criar um novo FlowSheetRecord e registrar medições contínuas para nova hospitalização",
		async () => {
			let eventPublished = false;
			let measurementPayload: PatientMeasurementsRecordedPayload | null = null;
			const publish = <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME) {
					eventPublished = true;
					measurementPayload = evt.payload as PatientMeasurementsRecordedPayload;
				}
			};

			const eventBus: EventBus = {
				publish,
				publishAll: (...evts: Event<unknown>[]) => {
					evts.forEach((e) => publish(e));
				},
				subscribe: function <T>(_: string, _h: EventHandler<T>): void {},
			};

			const { service, flowSheetRecordRepository, context } = setupService(
				{ eventBus },
			);

			const hospitalizationId = IdValue.random();
			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				measurements: [
					{ measurementTypeId: MeasurementTypeEnum.GLUCOSE, value: "120", notes: "mg/dL" },
					{
						measurementTypeId: MeasurementTypeEnum.PAIN_SCORE,
						value: "3",
						notes: "Mild discomfort",
					},
				],
			};

			const result = await service.recordContinuousMeasurements(context, request);

			assertEquals(
				result.isRight(),
				true,
				`Expected right, got left: ${JSON.stringify(result.value)}`,
			);
			assertEquals(eventPublished, true, "PatientMeasurementsRecordedEvent não foi publicado.");

			// Verificar se FlowSheetRecord foi criado
			const flowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(flowSheetRecordOrErr.isRight(), true);
			const flowSheetRecord = flowSheetRecordOrErr.right!;
			assertEquals(flowSheetRecord.measurements.length, 2);

			if (measurementPayload) {
				const payload = measurementPayload as PatientMeasurementsRecordedPayload;
				assertEquals(payload.hospitalizationId, hospitalizationId.value);
				assertEquals(payload.recordingType, "CONTINUOUS_MEASUREMENT");
				assertEquals(payload.roundType, undefined);
				assertEquals(payload.measurements.length, 2);
			} else {
				assert(false, "measurementPayload should not be null");
			}
		},
	);

	await t.step(
		"Deve adicionar medições contínuas a FlowSheetRecord existente",
		async () => {
			const { service, flowSheetRecordRepository, context } = setupService();

			// Criar FlowSheetRecord existente
			const hospitalizationId = IdValue.random();
			const existingFlowSheetRecord = new FlowSheetRecord.Builder()
				.withId(IdValue.random())
				.withHospitalizationId(hospitalizationId)
				.build().right!;
			await flowSheetRecordRepository.save(existingFlowSheetRecord);

			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-02",
				measurements: [
					{ measurementTypeId: MeasurementTypeEnum.LACTATE, value: "2.1", notes: "mmol/L" },
					{
						measurementTypeId: MeasurementTypeEnum.OXYGEN_SATURATION,
						value: "95",
						notes: "Slightly low",
					},
				],
			};

			const result = await service.recordContinuousMeasurements(context, request);

			assertEquals(result.isRight(), true);

			const updatedFlowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(updatedFlowSheetRecordOrErr.isRight(), true);
			const updatedFlowSheetRecord = updatedFlowSheetRecordOrErr.right!;
			assertEquals(updatedFlowSheetRecord.measurements.length, 2);
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
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.GLUCOSE, value: "120" },
			],
		};

		const result = await service.recordContinuousMeasurements(ctx, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, ForbiddenError);
	});

	await t.step("Deve retornar erro se os dados forem inválidos", async () => {
		const { service, context } = setupService();

		const request = {
			hospitalizationId: "id-inválido",
			dateTime: "data-inválida",
			measurements: [
				{ measurementTypeId: "", value: "" }, // Dados inválidos
			],
		};

		const result = await service.recordContinuousMeasurements(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
	});

	await t.step("Deve permitir VET_ASSISTANT registrar medições contínuas", async () => {
		const { service, context } = setupService();
		const assistantContext: Context = {
			principal: "assistant@domain.com",
			roles: [UserRoleEnum.VET_ASSISTANT],
		};

		const request = {
			hospitalizationId: IdValue.random().value,
			dateTime: "2024-01-01",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.WEIGHT, value: "25.5", notes: "kg" },
			],
		};

		const result = await service.recordContinuousMeasurements(assistantContext, request);

		assertEquals(result.isRight(), true);
	});

	await t.step("Deve registrar diferentes tipos de medições contínuas", async () => {
		const { service, flowSheetRecordRepository, context } = setupService();

		const hospitalizationId = IdValue.random();
		const testCases = [
			{ measurementTypeId: MeasurementTypeEnum.GLUCOSE, value: "95", notes: "Normal" },
			{ measurementTypeId: MeasurementTypeEnum.LACTATE, value: "2.5", notes: "Elevated" },
			{ measurementTypeId: MeasurementTypeEnum.PAIN_SCORE, value: "5", notes: "Moderate pain" },
			{ measurementTypeId: MeasurementTypeEnum.WEIGHT, value: "24.8", notes: "Lost weight" },
		];

		for (const measurement of testCases) {
			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				measurements: [measurement],
			};

			const result = await service.recordContinuousMeasurements(context, request);
			assertEquals(
				result.isRight(),
				true,
				`Failed for measurement ${measurement.measurementTypeId}`,
			);
		}

		// Verificar que todas as medições foram registradas
		const flowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
			hospitalizationId,
		);
		assertEquals(flowSheetRecordOrErr.isRight(), true);
		assertEquals(flowSheetRecordOrErr.right!.measurements.length, testCases.length);
	});

	await t.step("Deve registrar medições neurológicas contínuas", async () => {
		const { service, flowSheetRecordRepository, context } = setupService();

		const hospitalizationId = IdValue.random();
		const neuroMeasurements = [
			{
				measurementTypeId: MeasurementTypeEnum.GLASGOW_COMA_SCALE,
				value: "14",
				notes: "Slightly decreased",
			},
			{ measurementTypeId: MeasurementTypeEnum.PUPIL_SIZE_LEFT, value: "4mm", notes: "Dilated" },
			{ measurementTypeId: MeasurementTypeEnum.PUPIL_SIZE_RIGHT, value: "3mm", notes: "Normal" },
		];

		const request = {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			measurements: neuroMeasurements,
		};

		const result = await service.recordContinuousMeasurements(context, request);

		assertEquals(result.isRight(), true);

		const flowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
			hospitalizationId,
		);
		assertEquals(flowSheetRecordOrErr.isRight(), true);
		assertEquals(flowSheetRecordOrErr.right!.measurements.length, 3);
	});
});

Deno.test("FlowSheetService - Cenários Integrados", async (t) => {
	await t.step(
		"Deve registrar ronda médica e medições contínuas no mesmo FlowSheetRecord",
		async () => {
			const { service, flowSheetRecordRepository, context } = setupService();

			const hospitalizationId = IdValue.random();

			// Registrar ronda médica
			const roundRequest = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				roundType: "STANDARD_VITALS",
				measurements: [
					{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "85" },
					{ measurementTypeId: MeasurementTypeEnum.RESPIRATORY_RATE, value: "22" },
					{ measurementTypeId: MeasurementTypeEnum.TEMPERATURE, value: "38.5" },
					{ measurementTypeId: MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR, value: "Pink" },
					{ measurementTypeId: MeasurementTypeEnum.CAPILLARY_REFILL_TIME, value: "2" },
				],
			};

			const roundResult = await service.recordMedicalRound(context, roundRequest);
			assertEquals(roundResult.isRight(), true);

			// Registrar medições contínuas
			const continuousRequest = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				measurements: [
					{ measurementTypeId: MeasurementTypeEnum.GLUCOSE, value: "120" },
					{ measurementTypeId: MeasurementTypeEnum.PAIN_SCORE, value: "3" },
				],
			};

			const continuousResult = await service.recordContinuousMeasurements(
				context,
				continuousRequest,
			);
			assertEquals(continuousResult.isRight(), true);

			// Verificar que ambos estão no mesmo FlowSheetRecord
			const flowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
				hospitalizationId,
			);
			assertEquals(flowSheetRecordOrErr.isRight(), true);
			const flowSheetRecord = flowSheetRecordOrErr.right!;
			assertEquals(flowSheetRecord.measurements.length, 7);
		},
	);

	await t.step("Deve registrar múltiplas rondas médicas de diferentes tipos", async () => {
		const { service, flowSheetRecordRepository, context } = setupService();

		const hospitalizationId = IdValue.random();
		const roundTypes = ["STANDARD_VITALS", "NEUROLOGICAL", "POST_OPERATIVE"];

		for (const roundType of roundTypes) {
			const requiredMeasurements = RoundPlan.getMeasurementsForRound(roundType);

			const measurements = requiredMeasurements.map((measurementTypeId) => ({
				measurementTypeId,
				value: "100",
				notes: `Test for ${roundType}`,
			}));

			const request = {
				hospitalizationId: hospitalizationId.value,
				dateTime: "2024-01-01",
				roundType,
				measurements,
			};

			const result = await service.recordMedicalRound(context, request);
			assertEquals(result.isRight(), true, `Failed for round type ${roundType}`);
		}

		// Verificar todos os registros
		const flowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
			hospitalizationId,
		);
		assertEquals(flowSheetRecordOrErr.isRight(), true);
		const flowSheetRecord = flowSheetRecordOrErr.right!;

		// Cada ronda tem medições diferentes, mas algumas podem se sobrepor
		assert(
			flowSheetRecord.measurements.length >= roundTypes.length,
			"Should have measurements from all rounds",
		);
	});

	await t.step("Deve publicar múltiplos eventos em sequência", async () => {
		let roundEventsCount = 0;
		let continuousEventsCount = 0;
		const eventBus: EventBus = {
			publish: <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME) {
					const payload = evt.payload as PatientMeasurementsRecordedPayload;
					if (payload.recordingType === "MEDICAL_ROUND") {
						roundEventsCount++;
					} else if (payload.recordingType === "CONTINUOUS_MEASUREMENT") {
						continuousEventsCount++;
					}
				}
			},
			publishAll: (...evts: Event<unknown>[]) => evts.forEach((e) => eventBus.publish(e)),
			subscribe: () => {},
		};

		const { service, context } = setupService({ eventBus });

		const hospitalizationId = IdValue.random();

		// Registrar múltiplas rondas e medições contínuas
		await service.recordMedicalRound(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			roundType: "STANDARD_VITALS",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "85" },
				{ measurementTypeId: MeasurementTypeEnum.RESPIRATORY_RATE, value: "22" },
				{ measurementTypeId: MeasurementTypeEnum.TEMPERATURE, value: "38.5" },
				{ measurementTypeId: MeasurementTypeEnum.MUCOUS_MEMBRANE_COLOR, value: "Pink" },
				{ measurementTypeId: MeasurementTypeEnum.CAPILLARY_REFILL_TIME, value: "2" },
			],
		});

		await service.recordContinuousMeasurements(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.GLUCOSE, value: "120" },
			],
		});

		await service.recordMedicalRound(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-02",
			roundType: "NEUROLOGICAL",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "88" },
				{ measurementTypeId: MeasurementTypeEnum.RESPIRATORY_RATE, value: "20" },
				{ measurementTypeId: MeasurementTypeEnum.TEMPERATURE, value: "38.2" },
				{ measurementTypeId: MeasurementTypeEnum.GLASGOW_COMA_SCALE, value: "15" },
				{ measurementTypeId: MeasurementTypeEnum.PUPIL_SIZE_LEFT, value: "3mm" },
				{ measurementTypeId: MeasurementTypeEnum.PUPIL_SIZE_RIGHT, value: "3mm" },
			],
		});

		assertEquals(roundEventsCount, 2);
		assertEquals(continuousEventsCount, 1);
	});

	await t.step("Deve permitir medições laboratoriais e vitais no mesmo registro", async () => {
		const { service, flowSheetRecordRepository, context } = setupService();

		const hospitalizationId = IdValue.random();

		// Registrar sinais vitais
		await service.recordContinuousMeasurements(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.HEART_RATE, value: "90", notes: "Elevated" },
				{ measurementTypeId: MeasurementTypeEnum.TEMPERATURE, value: "39.5", notes: "Fever" },
			],
		});

		// Registrar valores laboratoriais
		await service.recordContinuousMeasurements(context, {
			hospitalizationId: hospitalizationId.value,
			dateTime: "2024-01-01",
			measurements: [
				{ measurementTypeId: MeasurementTypeEnum.GLUCOSE, value: "85", notes: "Low normal" },
				{ measurementTypeId: MeasurementTypeEnum.LACTATE, value: "3.2", notes: "Elevated" },
				{ measurementTypeId: MeasurementTypeEnum.PCV_HEMATOCRIT, value: "35", notes: "Low" },
			],
		});

		const flowSheetRecordOrErr = await flowSheetRecordRepository.findByHospitalizationId(
			hospitalizationId,
		);
		assertEquals(flowSheetRecordOrErr.isRight(), true);
		const flowSheetRecord = flowSheetRecordOrErr.right!;
		assertEquals(flowSheetRecord.measurements.length, 5);

		// Verificar que podemos filtrar por tipo
		const heartRateMeasurements = flowSheetRecord.getMeasurementsByType(
			MeasurementTypeEnum.HEART_RATE,
		);
		assertEquals(heartRateMeasurements.length, 1);
		assertEquals(heartRateMeasurements[0].value, "90");

		const glucoseMeasurements = flowSheetRecord.getMeasurementsByType(MeasurementTypeEnum.GLUCOSE);
		assertEquals(glucoseMeasurements.length, 1);
		assertEquals(glucoseMeasurements[0].value, "85");
	});
});

function setupService(
	opts?: Partial<{
		eventBus: EventBus;
		flowSheetRecordRepository: InmemFlowSheetRecordRepository;
	}>,
) {
	const eventBus = opts?.eventBus ?? new InMemEventBus();
	const flowSheetRecordRepository = opts?.flowSheetRecordRepository ??
		new InmemFlowSheetRecordRepository();

	const service = new FlowSheetService(
		eventBus,
		flowSheetRecordRepository,
	);

	return {
		service,
		eventBus,
		flowSheetRecordRepository,
		context: {
			principal: "user@domain.com",
			roles: [UserRoleEnum.MED_VET],
		} as Context,
	};
}
