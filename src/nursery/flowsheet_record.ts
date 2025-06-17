import { IdValue } from "@shared/id_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { Event, withHeader, withPayload } from "@shared/event.ts";
import { z } from "@deps/zod";
import { MeasurementValue } from "./measurement_value.ts";
import {
	PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME,
	PatientMeasurementsRecordedPayload,
} from "./patient_measurements_recorded_event.ts";

export class FlowSheetRecord {
	readonly #id: IdValue;
	readonly #hospitalizationId: IdValue;
	#measurements: MeasurementValue[];

	#uncommitedEvents: Event<PatientMeasurementsRecordedPayload>[];

	private constructor(
		id: IdValue,
		hospitalizationId: IdValue,
		measurements: MeasurementValue[] = [],
	) {
		this.#id = id;
		this.#hospitalizationId = hospitalizationId;
		this.#measurements = [...measurements];
		this.#uncommitedEvents = [];
	}

	get id(): IdValue {
		return this.#id;
	}

	get hospitalizationId(): IdValue {
		return this.#hospitalizationId;
	}

	get measurements(): MeasurementValue[] {
		return [...this.#measurements]
			.sort((a, b) => b.dateTime.value.localeCompare(a.dateTime.value));
	}

	addMeasurements(
		measurements: MeasurementValue[],
		recordingType: "MEDICAL_ROUND" | "CONTINUOUS_MEASUREMENT",
		roundType?: string,
	): Either<ValidationError, void> {
		if (!measurements || measurements.length === 0) {
			return left(
				new ValidationError("FlowSheetRecord:addMeasurements", [
					"Deve haver pelo menos uma medição",
				]),
			);
		}

		if (recordingType === "MEDICAL_ROUND" && !roundType) {
			return left(
				new ValidationError("FlowSheetRecord:addMeasurements", [
					"O tipo de ronda é obrigatório para medições de ronda médica",
				]),
			);
		}

		// Add all measurements
		this.#measurements.push(...measurements);

		// Create domain event
		const event = Event.create<PatientMeasurementsRecordedPayload>(
			PATIENT_MEASUREMENTS_RECORDED_EVENT_NAME,
			withHeader("AggregateType", "nursery.FlowSheetRecord"),
			withHeader("AggregateId", this.id.value),
			withPayload({
				flowSheetRecordId: this.id.value,
				hospitalizationId: this.hospitalizationId.value,
				recordingType,
				...(roundType && { roundType }),
				measurements: measurements.map((m) => ({
					dateTime: m.dateTime.value,
					measurementId: m.measurementTypeId,
					value: String(m.value),
					...(m.notes && { notes: m.notes }),
				})),
				totalMeasurementsInRecord: this.#measurements.length,
			}),
		);
		this.#uncommitedEvents.push(event);

		return right(undefined);
	}

	getMeasurementsByType(measurementTypeId: string): MeasurementValue[] {
		return this.#measurements
			.filter((m) => m.measurementTypeId === measurementTypeId)
			.sort((a, b) => b.dateTime.value.localeCompare(a.dateTime.value));
	}

	getLatestMeasurement(measurementTypeId: string): MeasurementValue | undefined {
		const measurements = this.getMeasurementsByType(measurementTypeId);
		return measurements.length > 0 ? measurements[0] : undefined;
	}

	clearUncommitedEvents(): Event<PatientMeasurementsRecordedPayload>[] {
		const oldEvents = this.#uncommitedEvents;
		this.#uncommitedEvents = [];
		return oldEvents;
	}

	clone(): FlowSheetRecord {
		const cloned = new FlowSheetRecord(
			this.#id,
			this.#hospitalizationId,
			this.#measurements,
		);

		// Clear uncommitted events to prevent duplicate event publishing
		cloned.#uncommitedEvents = [];

		return cloned;
	}

	static Builder = class {
		private id: IdValue;
		private hospitalizationId: IdValue;
		private measurements: MeasurementValue[] = [];

		constructor() {
			this.id = IdValue.random();
			this.hospitalizationId = undefined as unknown as IdValue;
		}

		withId(id: IdValue): this {
			this.id = id;
			return this;
		}

		withHospitalizationId(hospitalizationId: IdValue): this {
			this.hospitalizationId = hospitalizationId;
			return this;
		}

		withMeasurements(measurements: MeasurementValue[]): this {
			this.measurements = measurements;
			return this;
		}

		build(): Either<ValidationError, FlowSheetRecord> {
			const result = FLOWSHEET_RECORD_CONSTRUCTOR_SCHEMA.safeParse({
				id: this.id,
				hospitalizationId: this.hospitalizationId,
				measurements: this.measurements,
			});

			if (!result.success) {
				const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
				return left(new ValidationError("FlowSheetRecord.Builder", errors));
			}

			const data = result.data;
			return right(
				new FlowSheetRecord(
					data.id,
					data.hospitalizationId,
					data.measurements,
				),
			);
		}

		rebuild(): FlowSheetRecord {
			const result = FLOWSHEET_RECORD_SCHEMA.safeParse({
				id: this.id,
				hospitalizationId: this.hospitalizationId,
				measurements: this.measurements,
			});

			if (!result.success) {
				const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
				throw new ValidationError("FlowSheetRecord.Builder", errors);
			}

			const data = result.data;
			const flowSheetRecord = new FlowSheetRecord(
				data.id,
				data.hospitalizationId,
				data.measurements,
			);

			flowSheetRecord.clearUncommitedEvents();
			return flowSheetRecord;
		}
	};
}

export const FLOWSHEET_RECORD_CONSTRUCTOR_SCHEMA = z.object({
	id: z.custom<IdValue>(
		(val) => val instanceof IdValue,
		"O ID do registro de medições é obrigatório",
	),
	hospitalizationId: z.custom<IdValue>(
		(val) => val instanceof IdValue,
		"O ID da hospitalização é obrigatório",
	),
	measurements: z.custom<MeasurementValue[]>().default([]),
});

export const FLOWSHEET_RECORD_SCHEMA = FLOWSHEET_RECORD_CONSTRUCTOR_SCHEMA.extend({
	measurements: z.custom<MeasurementValue[]>().default([]),
});
