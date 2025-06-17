import { IdValue } from "@shared/id_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { Event, withHeader, withPayload } from "@shared/event.ts";
import { z } from "@deps/zod";
import { Feeding } from "./feeding.ts";
import { Elimination } from "./elimination.ts";
import {
	PATIENT_INTAKE_RECORDED_EVENT_NAME,
	PatientIntakeRecordedPayload,
} from "./patient_intake_recorded_event.ts";
import {
	PATIENT_OUTPUT_RECORDED_EVENT_NAME,
	PatientOutputRecordedPayload,
} from "./patient_output_recorded_event.ts";

export class IntakeOutput {
	readonly #id: IdValue;
	readonly #hospitalizationId: IdValue;
	#feedings: Feeding[];
	#eliminations: Elimination[];

	#uncommitedEvents: Event<
		| PatientIntakeRecordedPayload
		| PatientOutputRecordedPayload
	>[];

	private constructor(
		id: IdValue,
		hospitalizationId: IdValue,
		feedings: Feeding[] = [],
		eliminations: Elimination[] = [],
	) {
		this.#id = id;
		this.#hospitalizationId = hospitalizationId;
		this.#feedings = [...feedings];
		this.#eliminations = [...eliminations];
		this.#uncommitedEvents = [];
	}

	get id(): IdValue {
		return this.#id;
	}

	get hospitalizationId(): IdValue {
		return this.#hospitalizationId;
	}

	get feedings(): Feeding[] {
		return [...this.#feedings]
			.sort((a, b) => b.dateTime.value.localeCompare(a.dateTime.value));
	}

	get eliminations(): Elimination[] {
		return [...this.#eliminations]
			.sort((a, b) => b.dateTime.value.localeCompare(a.dateTime.value));
	}

	addFeeding(feeding: Feeding): Either<ValidationError, void> {
		this.#feedings.push(feeding);

		const event = Event.create<PatientIntakeRecordedPayload>(
			PATIENT_INTAKE_RECORDED_EVENT_NAME,
			withHeader("AggregateType", "nursery.IntakeOutput"),
			withHeader("AggregateId", this.id.value),
			withPayload({
				intakeOutputId: this.id.value,
				hospitalizationId: this.hospitalizationId.value,
				dateTime: feeding.dateTime.value,
				type: feeding.type,
				notes: feeding.notes,
				feedingCategory: feeding.feedingCategory,
				appetiteScore: feeding.appetiteScore,
			} as PatientIntakeRecordedPayload),
		);
		this.#uncommitedEvents.push(event);

		return right(undefined);
	}

	addElimination(elimination: Elimination): Either<ValidationError, void> {
		this.#eliminations.push(elimination);

		const event = Event.create<PatientOutputRecordedPayload>(
			PATIENT_OUTPUT_RECORDED_EVENT_NAME,
			withHeader("AggregateType", "nursery.IntakeOutput"),
			withHeader("AggregateId", this.id.value),
			withPayload({
				intakeOutputId: this.id.value,
				hospitalizationId: this.hospitalizationId.value,
				dateTime: elimination.dateTime.value,
				type: elimination.type,
				aspect: elimination.aspect,
			} as PatientOutputRecordedPayload),
		);
		this.#uncommitedEvents.push(event);

		return right(undefined);
	}

	clearUncommitedEvents(): Event<
		| PatientIntakeRecordedPayload
		| PatientOutputRecordedPayload
	>[] {
		const oldEvents = this.#uncommitedEvents;
		this.#uncommitedEvents = [];
		return oldEvents;
	}

	clone(): IntakeOutput {
		const cloned = new IntakeOutput(
			this.#id,
			this.#hospitalizationId,
			this.#feedings,
			this.#eliminations,
		);

		// Clear uncommitted events to prevent duplicate event publishing
		cloned.#uncommitedEvents = [];

		return cloned;
	}

	static Builder = class {
		private id: IdValue;
		private hospitalizationId: IdValue;
		private feedings: Feeding[] = [];
		private eliminations: Elimination[] = [];

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

		withFeedings(feedings: Feeding[]): this {
			this.feedings = feedings;
			return this;
		}

		withEliminations(eliminations: Elimination[]): this {
			this.eliminations = eliminations;
			return this;
		}

		build(): Either<ValidationError, IntakeOutput> {
			const result = INTAKE_OUTPUT_CONSTRUCTOR_SCHEMA.safeParse({
				id: this.id,
				hospitalizationId: this.hospitalizationId,
				feedings: this.feedings,
				eliminations: this.eliminations,
			});

			if (!result.success) {
				const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
				return left(new ValidationError("IntakeOutput.Builder", errors));
			}

			const data = result.data;
			return right(
				new IntakeOutput(
					data.id,
					data.hospitalizationId,
					data.feedings,
					data.eliminations,
				),
			);
		}

		rebuild(): IntakeOutput {
			const result = INTAKE_OUTPUT_SCHEMA.safeParse({
				id: this.id,
				hospitalizationId: this.hospitalizationId,
				feedings: this.feedings,
				eliminations: this.eliminations,
			});

			if (!result.success) {
				const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
				throw new ValidationError("IntakeOutput.Builder", errors);
			}

			const data = result.data;
			const intakeOutput = new IntakeOutput(
				data.id,
				data.hospitalizationId,
				data.feedings,
				data.eliminations,
			);

			intakeOutput.clearUncommitedEvents();
			return intakeOutput;
		}
	};
}

export const INTAKE_OUTPUT_CONSTRUCTOR_SCHEMA = z.object({
	id: z.custom<IdValue>(
		(val) => val instanceof IdValue,
		"O ID do controle de entrada/saída é obrigatório",
	),
	hospitalizationId: z.custom<IdValue>(
		(val) => val instanceof IdValue,
		"O ID da hospitalização é obrigatório",
	),
	feedings: z.custom<Feeding[]>().default([]),
	eliminations: z.custom<Elimination[]>().default([]),
});

export const INTAKE_OUTPUT_SCHEMA = INTAKE_OUTPUT_CONSTRUCTOR_SCHEMA.extend({
	feedings: z.custom<Feeding[]>().default([]),
	eliminations: z.custom<Elimination[]>().default([]),
});
