import { assertEquals, assertInstanceOf } from "@deps/assert";
import { DateValue } from "@shared/date_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { FlowSheetRecord } from "./flowsheet_record.ts";
import { MeasurementValue } from "./measurement_value.ts";
import { MeasurementTypeEnum } from "./measurement_type_enum.ts";
import { ValidationError } from "@shared/validation_error.ts";
import {
	PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME,
	PatientMeasurementsRecordedPayload,
} from "./patient_measurements_recorded_event.ts";

Deno.test("FlowSheetRecord", async (t) => {
	await t.step("Deve criar um FlowSheetRecord válido usando o Builder", () => {
		const id = IdValue.random();
		const hospitalizationId = IdValue.random();

		const flowSheetRecordOrErr = new FlowSheetRecord.Builder()
			.withId(id)
			.withHospitalizationId(hospitalizationId)
			.build();

		assertEquals(flowSheetRecordOrErr.isRight(), true);
		const flowSheetRecord = flowSheetRecordOrErr.right!;
		assertEquals(flowSheetRecord.id, id);
		assertEquals(flowSheetRecord.hospitalizationId, hospitalizationId);
		assertEquals(flowSheetRecord.measurements.length, 0);
	});

	await t.step("Deve retornar erro se o ID da hospitalização não for fornecido no Builder", () => {
		const id = IdValue.random();

		const flowSheetRecordOrErr = new FlowSheetRecord.Builder()
			.withId(id)
			.build();

		assertEquals(flowSheetRecordOrErr.isLeft(), true);
		assertInstanceOf(flowSheetRecordOrErr.value, ValidationError);
	});

	await t.step("Deve adicionar medições de ronda médica e gerar evento", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurements = [
			createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85"),
			createValidMeasurement(MeasurementTypeEnum.RESPIRATORY_RATE, "22"),
			createValidMeasurement(MeasurementTypeEnum.TEMPERATURE, "38.5"),
		];

		const result = flowSheetRecord.addMeasurements(
			measurements,
			"MEDICAL_ROUND",
			"STANDARD_VITALS",
		);

		assertEquals(result.isRight(), true);
		assertEquals(flowSheetRecord.measurements.length, 3);

		const events = flowSheetRecord.clearUncommitedEvents();
		assertEquals(events.length, 1);
		assertEquals(events[0].header("EventName"), PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME);

		const payload = events[0].payload as PatientMeasurementsRecordedPayload;
		assertEquals(payload.flowSheetRecordId, flowSheetRecord.id.value);
		assertEquals(payload.hospitalizationId, flowSheetRecord.hospitalizationId.value);
		assertEquals(payload.recordingType, "MEDICAL_ROUND");
		assertEquals(payload.roundType, "STANDARD_VITALS");
		assertEquals(payload.measurements.length, 3);
		assertEquals(payload.totalMeasurementsInRecord, 3);
	});

	await t.step("Deve adicionar medições contínuas e gerar evento", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurements = [
			createValidMeasurement(MeasurementTypeEnum.GLUCOSE, "120"),
			createValidMeasurement(MeasurementTypeEnum.PAIN_SCORE, "3"),
		];

		const result = flowSheetRecord.addMeasurements(measurements, "CONTINUOUS_MEASUREMENT");

		assertEquals(result.isRight(), true);
		assertEquals(flowSheetRecord.measurements.length, 2);

		const events = flowSheetRecord.clearUncommitedEvents();
		assertEquals(events.length, 1);
		assertEquals(events[0].header("EventName"), PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME);

		const payload = events[0].payload as PatientMeasurementsRecordedPayload;
		assertEquals(payload.recordingType, "CONTINUOUS_MEASUREMENT");
		assertEquals(payload.roundType, undefined);
		assertEquals(payload.measurements.length, 2);
	});

	await t.step("Deve retornar erro se não houver medições para adicionar", () => {
		const flowSheetRecord = createValidFlowSheetRecord();

		const result = flowSheetRecord.addMeasurements([], "MEDICAL_ROUND", "STANDARD_VITALS");

		assertEquals(result.isLeft(), true);
		const error = result.value as ValidationError;
		assertEquals(
			error.errors.some((e) => e.includes("Deve haver pelo menos uma medição")),
			true,
		);
	});

	await t.step("Deve retornar erro se ronda médica não tiver tipo de ronda", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurements = [createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85")];

		const result = flowSheetRecord.addMeasurements(measurements, "MEDICAL_ROUND");

		assertEquals(result.isLeft(), true);
		const error = result.value as ValidationError;
		assertEquals(
			error.errors.some((e) =>
				e.includes("O tipo de ronda é obrigatório para medições de ronda médica")
			),
			true,
		);
	});

	await t.step("Deve adicionar múltiplas medições em sequência", () => {
		const flowSheetRecord = createValidFlowSheetRecord();

		const firstBatch = [
			createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85"),
			createValidMeasurement(MeasurementTypeEnum.TEMPERATURE, "38.5"),
		];

		const secondBatch = [
			createValidMeasurement(MeasurementTypeEnum.GLUCOSE, "120"),
			createValidMeasurement(MeasurementTypeEnum.WEIGHT, "25.5"),
		];

		flowSheetRecord.addMeasurements(firstBatch, "MEDICAL_ROUND", "STANDARD_VITALS");
		flowSheetRecord.addMeasurements(secondBatch, "CONTINUOUS_MEASUREMENT");

		assertEquals(flowSheetRecord.measurements.length, 4);

		const events = flowSheetRecord.clearUncommitedEvents();
		assertEquals(events.length, 2);
	});

	await t.step("Deve ordenar medições por data descendente", () => {
		const flowSheetRecord = createValidFlowSheetRecord();

		const measurement1 = MeasurementValue.create(
			DateValue.fromString("2024-03-15").right!,
			MeasurementTypeEnum.HEART_RATE,
			"85",
			"Primeira medição",
		).right!;

		const measurement2 = MeasurementValue.create(
			DateValue.fromString("2024-03-17").right!,
			MeasurementTypeEnum.HEART_RATE,
			"90",
			"Terceira medição",
		).right!;

		const measurement3 = MeasurementValue.create(
			DateValue.fromString("2024-03-16").right!,
			MeasurementTypeEnum.HEART_RATE,
			"88",
			"Segunda medição",
		).right!;

		flowSheetRecord.addMeasurements([measurement1], "CONTINUOUS_MEASUREMENT");
		flowSheetRecord.addMeasurements([measurement2], "CONTINUOUS_MEASUREMENT");
		flowSheetRecord.addMeasurements([measurement3], "CONTINUOUS_MEASUREMENT");

		const sortedMeasurements = flowSheetRecord.measurements;
		assertEquals(sortedMeasurements.length, 3);
		assertEquals(sortedMeasurements[0].notes, "Terceira medição"); // 2024-03-17
		assertEquals(sortedMeasurements[1].notes, "Segunda medição"); // 2024-03-16
		assertEquals(sortedMeasurements[2].notes, "Primeira medição"); // 2024-03-15
	});

	await t.step("Deve filtrar medições por tipo", () => {
		const flowSheetRecord = createValidFlowSheetRecord();

		const measurements = [
			createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85"),
			createValidMeasurement(MeasurementTypeEnum.TEMPERATURE, "38.5"),
			createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "90"),
			createValidMeasurement(MeasurementTypeEnum.WEIGHT, "25.5"),
		];

		flowSheetRecord.addMeasurements(measurements, "CONTINUOUS_MEASUREMENT");

		const heartRateMeasurements = flowSheetRecord.getMeasurementsByType(
			MeasurementTypeEnum.HEART_RATE,
		);
		assertEquals(heartRateMeasurements.length, 2);

		const temperatureMeasurements = flowSheetRecord.getMeasurementsByType(
			MeasurementTypeEnum.TEMPERATURE,
		);
		assertEquals(temperatureMeasurements.length, 1);

		const glucoseMeasurements = flowSheetRecord.getMeasurementsByType(MeasurementTypeEnum.GLUCOSE);
		assertEquals(glucoseMeasurements.length, 0);
	});

	await t.step("Deve obter a medição mais recente de um tipo", () => {
		const flowSheetRecord = createValidFlowSheetRecord();

		const oldMeasurement = MeasurementValue.create(
			DateValue.fromString("2024-03-15").right!,
			MeasurementTypeEnum.HEART_RATE,
			"85",
		).right!;

		const newMeasurement = MeasurementValue.create(
			DateValue.fromString("2024-03-17").right!,
			MeasurementTypeEnum.HEART_RATE,
			"90",
		).right!;

		flowSheetRecord.addMeasurements([oldMeasurement], "CONTINUOUS_MEASUREMENT");
		flowSheetRecord.addMeasurements([newMeasurement], "CONTINUOUS_MEASUREMENT");

		const latestHeartRate = flowSheetRecord.getLatestMeasurement(MeasurementTypeEnum.HEART_RATE);
		assertEquals(latestHeartRate?.value, "90");
		assertEquals(latestHeartRate?.dateTime.value, "2024-03-17");

		const latestGlucose = flowSheetRecord.getLatestMeasurement(MeasurementTypeEnum.GLUCOSE);
		assertEquals(latestGlucose, undefined);
	});

	await t.step("Deve retornar cópias das listas para evitar mutação externa", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurement = createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85");

		flowSheetRecord.addMeasurements([measurement], "CONTINUOUS_MEASUREMENT");

		const measurementsList1 = flowSheetRecord.measurements;
		const measurementsList2 = flowSheetRecord.measurements;

		// Listas diferentes (novas instâncias)
		assertEquals(measurementsList1 !== measurementsList2, true);

		// Mas com o mesmo conteúdo
		assertEquals(measurementsList1.length, measurementsList2.length);
	});

	await t.step("Deve limpar eventos não commitados", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurement = createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85");

		flowSheetRecord.addMeasurements([measurement], "CONTINUOUS_MEASUREMENT");

		const events1 = flowSheetRecord.clearUncommitedEvents();
		assertEquals(events1.length, 1);

		const events2 = flowSheetRecord.clearUncommitedEvents();
		assertEquals(events2.length, 0);
	});

	await t.step("Deve criar um clone sem eventos não commitados", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurement = createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85");

		flowSheetRecord.addMeasurements([measurement], "CONTINUOUS_MEASUREMENT");

		// Verificar que há eventos antes do clone
		const eventsBeforeClone = flowSheetRecord.clearUncommitedEvents();
		assertEquals(eventsBeforeClone.length, 1);

		// Adicionar mais um evento
		flowSheetRecord.addMeasurements([measurement], "CONTINUOUS_MEASUREMENT");

		const cloned = flowSheetRecord.clone();

		// Clone deve ter os mesmos dados
		assertEquals(cloned.id.value, flowSheetRecord.id.value);
		assertEquals(cloned.hospitalizationId.value, flowSheetRecord.hospitalizationId.value);
		assertEquals(cloned.measurements.length, flowSheetRecord.measurements.length);

		// Mas não deve ter eventos não commitados
		const clonedEvents = cloned.clearUncommitedEvents();
		assertEquals(clonedEvents.length, 0);
	});

	await t.step("Deve criar FlowSheetRecord com medições iniciais usando Builder", () => {
		const id = IdValue.random();
		const hospitalizationId = IdValue.random();
		const measurement = createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85");

		const flowSheetRecordOrErr = new FlowSheetRecord.Builder()
			.withId(id)
			.withHospitalizationId(hospitalizationId)
			.withMeasurements([measurement])
			.build();

		assertEquals(flowSheetRecordOrErr.isRight(), true);
		const flowSheetRecord = flowSheetRecordOrErr.right!;
		assertEquals(flowSheetRecord.measurements.length, 1);
		assertEquals(flowSheetRecord.measurements[0], measurement);
	});

	await t.step("Deve reconstruir FlowSheetRecord usando rebuild", () => {
		const id = IdValue.random();
		const hospitalizationId = IdValue.random();
		const measurement = createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85");

		const flowSheetRecord = new FlowSheetRecord.Builder()
			.withId(id)
			.withHospitalizationId(hospitalizationId)
			.withMeasurements([measurement])
			.rebuild();

		assertEquals(flowSheetRecord.id, id);
		assertEquals(flowSheetRecord.hospitalizationId, hospitalizationId);
		assertEquals(flowSheetRecord.measurements.length, 1);

		// Rebuild não deve gerar eventos
		const events = flowSheetRecord.clearUncommitedEvents();
		assertEquals(events.length, 0);
	});

	await t.step("Deve gerar eventos com payload completo", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurements = [
			createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85", "Normal rhythm"),
			createValidMeasurement(MeasurementTypeEnum.TEMPERATURE, "38.5", "Slight fever"),
		];

		flowSheetRecord.addMeasurements(measurements, "MEDICAL_ROUND", "COMPREHENSIVE");

		const events = flowSheetRecord.clearUncommitedEvents();
		assertEquals(events.length, 1);

		const payload = events[0].payload as PatientMeasurementsRecordedPayload;
		assertEquals(payload.recordingType, "MEDICAL_ROUND");
		assertEquals(payload.roundType, "COMPREHENSIVE");
		assertEquals(payload.measurements[0].measurementId, MeasurementTypeEnum.HEART_RATE);
		assertEquals(payload.measurements[0].value, "85");
		assertEquals(payload.measurements[0].notes, "Normal rhythm");
		assertEquals(payload.measurements[1].measurementId, MeasurementTypeEnum.TEMPERATURE);
		assertEquals(payload.measurements[1].value, "38.5");
		assertEquals(payload.measurements[1].notes, "Slight fever");
	});

	await t.step("Deve manter imutabilidade das propriedades do agregado", () => {
		const id = IdValue.random();
		const hospitalizationId = IdValue.random();

		const flowSheetRecord = new FlowSheetRecord.Builder()
			.withId(id)
			.withHospitalizationId(hospitalizationId)
			.build().right!;

		// As propriedades são readonly e não podem ser modificadas
		assertEquals(flowSheetRecord.id, id);
		assertEquals(flowSheetRecord.hospitalizationId, hospitalizationId);

		// Adicionar medições não deve afetar as propriedades básicas
		flowSheetRecord.addMeasurements(
			[createValidMeasurement(MeasurementTypeEnum.HEART_RATE, "85")],
			"CONTINUOUS_MEASUREMENT",
		);
		assertEquals(flowSheetRecord.id, id);
		assertEquals(flowSheetRecord.hospitalizationId, hospitalizationId);
	});

	await t.step("Deve permitir medições contínuas sem tipo de ronda", () => {
		const flowSheetRecord = createValidFlowSheetRecord();
		const measurements = [createValidMeasurement(MeasurementTypeEnum.GLUCOSE, "120")];

		const result = flowSheetRecord.addMeasurements(measurements, "CONTINUOUS_MEASUREMENT");

		assertEquals(result.isRight(), true);

		const events = flowSheetRecord.clearUncommitedEvents();
		const payload = events[0].payload as PatientMeasurementsRecordedPayload;
		assertEquals(payload.recordingType, "CONTINUOUS_MEASUREMENT");
		assertEquals(payload.roundType, undefined);
	});

	await t.step("Deve suportar diferentes tipos de medições laboratoriais", () => {
		const flowSheetRecord = createValidFlowSheetRecord();

		const labMeasurements = [
			createValidMeasurement(MeasurementTypeEnum.GLUCOSE, "95", "mg/dL"),
			createValidMeasurement(MeasurementTypeEnum.LACTATE, "2.1", "mmol/L"),
			createValidMeasurement(MeasurementTypeEnum.PCV_HEMATOCRIT, "45", "%"),
			createValidMeasurement(MeasurementTypeEnum.TOTAL_PROTEIN, "7.2", "g/dL"),
		];

		const result = flowSheetRecord.addMeasurements(labMeasurements, "CONTINUOUS_MEASUREMENT");

		assertEquals(result.isRight(), true);
		assertEquals(flowSheetRecord.measurements.length, 4);

		// Verificar que todas as medições estão presentes
		const glucoseMeasurements = flowSheetRecord.getMeasurementsByType(MeasurementTypeEnum.GLUCOSE);
		const lactateMeasurements = flowSheetRecord.getMeasurementsByType(MeasurementTypeEnum.LACTATE);
		const pcvMeasurements = flowSheetRecord.getMeasurementsByType(
			MeasurementTypeEnum.PCV_HEMATOCRIT,
		);
		const tpMeasurements = flowSheetRecord.getMeasurementsByType(MeasurementTypeEnum.TOTAL_PROTEIN);

		assertEquals(glucoseMeasurements.length, 1);
		assertEquals(lactateMeasurements.length, 1);
		assertEquals(pcvMeasurements.length, 1);
		assertEquals(tpMeasurements.length, 1);
	});

	await t.step("Deve suportar medições neurológicas", () => {
		const flowSheetRecord = createValidFlowSheetRecord();

		const neuroMeasurements = [
			createValidMeasurement(MeasurementTypeEnum.GLASGOW_COMA_SCALE, "15", "Alert and responsive"),
			createValidMeasurement(MeasurementTypeEnum.PUPIL_SIZE_LEFT, "3mm", "Normal size"),
			createValidMeasurement(MeasurementTypeEnum.PUPIL_SIZE_RIGHT, "3mm", "Equal to left"),
		];

		const result = flowSheetRecord.addMeasurements(
			neuroMeasurements,
			"MEDICAL_ROUND",
			"NEUROLOGICAL",
		);

		assertEquals(result.isRight(), true);
		assertEquals(flowSheetRecord.measurements.length, 3);

		const events = flowSheetRecord.clearUncommitedEvents();
		const payload = events[0].payload as PatientMeasurementsRecordedPayload;
		assertEquals(payload.roundType, "NEUROLOGICAL");
		assertEquals(payload.measurements.length, 3);
	});
});

function createValidFlowSheetRecord(): FlowSheetRecord {
	return new FlowSheetRecord.Builder()
		.withId(IdValue.random())
		.withHospitalizationId(IdValue.random())
		.build().right!;
}

function createValidMeasurement(
	measurementTypeId: MeasurementTypeEnum,
	value: string,
	notes?: string,
): MeasurementValue {
	return MeasurementValue.create(
		DateValue.fromString("2024-03-15").right!,
		measurementTypeId,
		value,
		notes,
	).right!;
}
