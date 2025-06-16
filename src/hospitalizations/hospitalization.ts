import { IdValue } from "@shared/id_value.ts";
import { DateValue } from "@shared/date_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { Event, withHeader, withPayload } from "@shared/event.ts";
import { z } from "@deps/zod";
import { ContactPersonValue } from "./contact_person_value.ts";
import { PeriodicReport } from "./periodic_report.ts";
import { ComplaintEnum } from "./complaint_enum.ts";
import { DiagnosisEnum } from "./diagnosis_enum.ts";
import { HospitalizationStateEnum } from "./hospitalization_state_enum.ts";
import { StateAtDischargeEnum } from "./state_at_discharge_enum.ts";
import {
	HOSPITALIZATION_CREATED_EVENT_NAME,
	HospitalizationCreatedPayload,
} from "./hospitalization_created_event.ts";
import {
	HOSPITALIZATION_UPDATED_EVENT_NAME,
	HospitalizationUpdatedPayload,
} from "./hospitalization_updated_event.ts";
import {
	PATIENT_DISCHARGED_EVENT_NAME,
	PatientDischargedPayload,
} from "./patient_discharged_event.ts";
import {
	PERIODIC_REPORT_RELEASED_EVENT_NAME,
	PeriodicReportReleasedPayload,
} from "./periodic_report_released_event.ts";

export class Hospitalization {
	readonly #id: IdValue;
	readonly #admissionDate: DateValue;
	#estimatedDischargeDate: DateValue;
	#dischargeDate?: DateValue;
	#state: HospitalizationStateEnum;
	#stateAtDischarge?: StateAtDischargeEnum;
	#initialDiagnosis: DiagnosisEnum[];
	#actualDiagnosis: DiagnosisEnum[];
	#complaints: ComplaintEnum[];

	// Pet information snapshot at admission
	readonly #petId: IdValue;
	readonly #petName: string;
	readonly #petAge: string;
	readonly #petWeight: number;

	// Owner information snapshot at admission
	readonly #ownerId: IdValue;
	readonly #ownerName: string;

	// Contact management
	#contactPerson: ContactPersonValue;

	// Reports collection
	#periodicReports: PeriodicReport[];

	#uncommitedEvents: Event<
		| HospitalizationCreatedPayload
		| HospitalizationUpdatedPayload
		| PatientDischargedPayload
		| PeriodicReportReleasedPayload
	>[];

	private constructor(
		id: IdValue,
		admissionDate: DateValue,
		estimatedDischargeDate: DateValue,
		initialDiagnosis: DiagnosisEnum[],
		complaints: ComplaintEnum[],
		petId: IdValue,
		petName: string,
		petAge: string,
		petWeight: number,
		ownerId: IdValue,
		ownerName: string,
		contactPerson: ContactPersonValue,
		state: HospitalizationStateEnum = HospitalizationStateEnum.ON_GOING,
		actualDiagnosis: DiagnosisEnum[] | undefined = undefined,
		dischargeDate: DateValue | undefined = undefined,
		stateAtDischarge: StateAtDischargeEnum | undefined = undefined,
		periodicReports: PeriodicReport[] = [],
	) {
		this.#id = id;
		this.#admissionDate = admissionDate;
		this.#estimatedDischargeDate = estimatedDischargeDate;
		this.#initialDiagnosis = [...initialDiagnosis];
		this.#actualDiagnosis = actualDiagnosis ?? [...initialDiagnosis];
		this.#complaints = [...complaints];
		this.#petId = petId;
		this.#petName = petName;
		this.#petAge = petAge;
		this.#petWeight = petWeight;
		this.#ownerId = ownerId;
		this.#ownerName = ownerName;
		this.#contactPerson = contactPerson;
		this.#periodicReports = [...periodicReports];
		this.#state = state;

		this.#dischargeDate = dischargeDate;
		this.#stateAtDischarge = stateAtDischarge;

		this.#uncommitedEvents = [];
		this.#uncommitedEvents.push(this.#createHospitalizationCreatedEvent(this));
	}

	get id(): IdValue {
		return this.#id;
	}

	get admissionDate(): DateValue {
		return this.#admissionDate;
	}

	get estimatedDischargeDate(): DateValue {
		return this.#estimatedDischargeDate;
	}

	get dischargeDate(): DateValue | undefined {
		return this.#dischargeDate;
	}

	get state(): HospitalizationStateEnum {
		return this.#state;
	}

	get stateAtDischarge(): StateAtDischargeEnum | undefined {
		return this.#stateAtDischarge;
	}

	get initialDiagnosis(): DiagnosisEnum[] {
		return [...this.#initialDiagnosis];
	}

	get actualDiagnosis(): DiagnosisEnum[] {
		return [...this.#actualDiagnosis];
	}

	get complaints(): ComplaintEnum[] {
		return [...this.#complaints];
	}

	get petId(): IdValue {
		return this.#petId;
	}

	get petName(): string {
		return this.#petName;
	}

	get petAge(): string {
		return this.#petAge;
	}

	get petWeight(): number {
		return this.#petWeight;
	}

	get ownerId(): IdValue {
		return this.#ownerId;
	}

	get ownerName(): string {
		return this.#ownerName;
	}

	get contactPerson(): ContactPersonValue {
		return this.#contactPerson;
	}

	get periodicReports(): PeriodicReport[] {
		return [...this.#periodicReports]
			.sort((a, b) => b.timestamp.value.localeCompare(a.timestamp.value));
	}

	get isActive(): boolean {
		return this.#state === HospitalizationStateEnum.ON_GOING;
	}

	updateEstimatedDischargeDate(estimatedDischargeDate: DateValue): Either<ValidationError, void> {
		if (!this.isActive) {
			return left(
				new ValidationError("Hospitalization:updateEstimatedDischargeDate", [
					"Não é possível alterar a data estimada de alta de uma hospitalização já finalizada",
				]),
			);
		}

		if (estimatedDischargeDate.earlierThan(this.#admissionDate)) {
			return left(
				new ValidationError("Hospitalization:updateEstimatedDischargeDate", [
					"A data estimada de alta deve ser posterior à data de admissão",
				]),
			);
		}

		this.#estimatedDischargeDate = estimatedDischargeDate;

		const evt = this.#createHospitalizationUpdatedEvent({
			id: this.id,
			estimatedDischargeDate: this.estimatedDischargeDate,
		});
		this.#uncommitedEvents.push(evt);

		return right(undefined);
	}

	updateActualDiagnosis(actualDiagnosis: DiagnosisEnum[]): Either<ValidationError, void> {
		if (!this.isActive) {
			return left(
				new ValidationError("Hospitalization:updateActualDiagnosis", [
					"Não é possível alterar o diagnóstico de uma hospitalização já finalizada",
				]),
			);
		}

		if (!actualDiagnosis || actualDiagnosis.length === 0) {
			return left(
				new ValidationError("Hospitalization:updateActualDiagnosis", [
					"Deve haver pelo menos um diagnóstico",
				]),
			);
		}

		if (actualDiagnosis.length > 10) {
			return left(
				new ValidationError("Hospitalization:updateActualDiagnosis", [
					"Não podem haver mais de 10 diagnósticos",
				]),
			);
		}

		this.#actualDiagnosis = [...actualDiagnosis];

		const evt = this.#createHospitalizationUpdatedEvent({
			id: this.id,
			actualDiagnosis: this.actualDiagnosis,
		});
		this.#uncommitedEvents.push(evt);

		return right(undefined);
	}

	changeContactPerson(contactPerson: ContactPersonValue): Either<ValidationError, void> {
		if (!this.isActive) {
			return left(
				new ValidationError("Hospitalization:changeContactPerson", [
					"Não é possível alterar a pessoa de contacto de uma hospitalização já finalizada",
				]),
			);
		}

		this.#contactPerson = contactPerson;

		const evt = this.#createHospitalizationUpdatedEvent({
			id: this.id,
			contactPersonChanged: true,
		});
		this.#uncommitedEvents.push(evt);

		return right(undefined);
	}

	addPeriodicReport(report: PeriodicReport): Either<ValidationError, void> {
		if (!this.isActive) {
			return left(
				new ValidationError("Hospitalization:addPeriodicReport", [
					"Não é possível adicionar relatórios a uma hospitalização já finalizada",
				]),
			);
		}

		this.#periodicReports.push(report);

		const event = Event.create<PeriodicReportReleasedPayload>(
			PERIODIC_REPORT_RELEASED_EVENT_NAME,
			withHeader("AggregateType", "hospitalizations.Hospitalization"),
			withHeader("AggregateId", this.id.value),
			withPayload({
				hospitalizationId: this.id.value,
				reportId: report.id.value,
				timestamp: report.timestamp.value,
				consciousnessState: report.consciousnessStates,
				annotations: report.annotations,
			}),
		);
		this.#uncommitedEvents.push(event);

		return right(undefined);
	}

	dischargePatient(
		dischargeDate: DateValue,
		stateAtDischarge: StateAtDischargeEnum,
	): Either<ValidationError, void> {
		if (!this.isActive) {
			return left(
				new ValidationError("Hospitalization:dischargePatient", [
					"Esta hospitalização já foi finalizada",
				]),
			);
		}

		if (dischargeDate.earlierThan(this.#admissionDate)) {
			return left(
				new ValidationError("Hospitalization:dischargePatient", [
					"A data de alta deve ser posterior à data de admissão",
				]),
			);
		}

		if (!stateAtDischarge || stateAtDischarge.trim().length < 5) {
			return left(
				new ValidationError("Hospitalization:dischargePatient", [
					"O estado na alta deve ter pelo menos 5 caracteres",
				]),
			);
		}

		this.#dischargeDate = dischargeDate;
		this.#stateAtDischarge = stateAtDischarge;
		this.#state = HospitalizationStateEnum.CLOSED;

		const evt = this.#createPatientDischargedEvent(this);
		this.#uncommitedEvents.push(evt);

		return right(undefined);
	}

	clearUncommitedEvents(): Event<
		| HospitalizationCreatedPayload
		| HospitalizationUpdatedPayload
		| PatientDischargedPayload
		| PeriodicReportReleasedPayload
	>[] {
		const oldEvents = this.#uncommitedEvents;
		this.#uncommitedEvents = [];
		return oldEvents;
	}

	#createHospitalizationCreatedEvent(
		hospitalization: Hospitalization,
	): Event<HospitalizationCreatedPayload> {
		return Event.create<HospitalizationCreatedPayload>(
			HOSPITALIZATION_CREATED_EVENT_NAME,
			withHeader("AggregateType", "hospitalizations.Hospitalization"),
			withHeader("AggregateId", hospitalization.id.value),
			withPayload({
				admissionDate: hospitalization.admissionDate.value,
				estimatedDischargeDate: hospitalization.estimatedDischargeDate.value,
				initialDiagnosis: hospitalization.initialDiagnosis,
				complaints: hospitalization.complaints, // Use ComplaintEnum[] directly
				petId: hospitalization.petId.value,
				petName: hospitalization.petName,
				petAge: hospitalization.petAge,
				petWeight: hospitalization.petWeight,
				ownerId: hospitalization.ownerId.value,
				ownerName: hospitalization.ownerName,
				contactPersonName: hospitalization.contactPerson.fullName,
				contactPersonWhatsApp: hospitalization.contactPerson.phoneNumber.formattedNumber,
				state: hospitalization.state, // Add current state
			}),
		);
	}

	#createHospitalizationUpdatedEvent(
		data: {
			id: IdValue;
			estimatedDischargeDate?: DateValue;
			actualDiagnosis?: DiagnosisEnum[];
			contactPersonChanged?: boolean;
		},
	): Event<HospitalizationUpdatedPayload> {
		return Event.create<HospitalizationUpdatedPayload>(
			HOSPITALIZATION_UPDATED_EVENT_NAME,
			withHeader("AggregateType", "hospitalizations.Hospitalization"),
			withHeader("AggregateId", data.id.value),
			withPayload({
				estimatedDischargeDate: data.estimatedDischargeDate?.value,
				actualDiagnosis: data.actualDiagnosis,
				contactPersonChanged: data.contactPersonChanged,
			} as HospitalizationUpdatedPayload),
		);
	}

	#createPatientDischargedEvent(
		hospitalization: Hospitalization,
	): Event<PatientDischargedPayload> {
		return Event.create<PatientDischargedPayload>(
			PATIENT_DISCHARGED_EVENT_NAME,
			withHeader("AggregateType", "hospitalizations.Hospitalization"),
			withHeader("AggregateId", hospitalization.id.value),
			withPayload({
				dischargeDate: hospitalization.dischargeDate!.value,
				stateAtDischarge: hospitalization.stateAtDischarge!,
				totalReports: hospitalization.periodicReports.length,
			}),
		);
	}

	clone(): Hospitalization {
		const cloned = new Hospitalization(
			this.#id,
			this.#admissionDate,
			this.#estimatedDischargeDate,
			this.#initialDiagnosis,
			this.#complaints,
			this.#petId,
			this.#petName,
			this.#petAge,
			this.#petWeight,
			this.#ownerId,
			this.#ownerName,
			this.#contactPerson,
		);

		cloned.#actualDiagnosis = [...this.#actualDiagnosis];
		cloned.#complaints = [...this.#complaints];
		cloned.#dischargeDate = this.#dischargeDate;
		cloned.#state = this.#state; // Clone the state
		cloned.#stateAtDischarge = this.#stateAtDischarge;
		cloned.#periodicReports = [...this.#periodicReports];

		// Clear uncommitted events to prevent duplicate event publishing
		cloned.#uncommitedEvents = [];

		return cloned;
	}

	static Builder = class {
		private id: IdValue;
		private admissionDate: DateValue;
		private estimatedDischargeDate: DateValue;
		private initialDiagnosis: DiagnosisEnum[];
		private complaints: ComplaintEnum[];
		private petId: IdValue;
		private petName: string;
		private petAge: string;
		private petWeight: number;
		private ownerId: IdValue;
		private ownerName: string;
		private contactPerson: ContactPersonValue;
		private state: HospitalizationStateEnum = HospitalizationStateEnum.ON_GOING;
		private actualDiagnosis: DiagnosisEnum[] | undefined;
		private dischargeDate: DateValue | undefined;
		private stateAtDischarge: StateAtDischargeEnum | undefined;
		private periodicReports: PeriodicReport[] = [];

		constructor() {
			this.id = IdValue.random();
			this.admissionDate = undefined as unknown as DateValue;
			this.estimatedDischargeDate = undefined as unknown as DateValue;
			this.initialDiagnosis = [];
			this.complaints = [];
			this.petId = undefined as unknown as IdValue;
			this.petName = "";
			this.petAge = "";
			this.petWeight = 0;
			this.ownerId = undefined as unknown as IdValue;
			this.ownerName = "";
			this.contactPerson = undefined as unknown as ContactPersonValue;
		}

		withId(id: IdValue): this {
			this.id = id;
			return this;
		}

		withAdmissionDate(admissionDate: DateValue): this {
			this.admissionDate = admissionDate;
			return this;
		}

		withEstimatedDischargeDate(estimatedDischargeDate: DateValue): this {
			this.estimatedDischargeDate = estimatedDischargeDate;
			return this;
		}

		withInitialDiagnosis(initialDiagnosis: DiagnosisEnum[]): this {
			this.initialDiagnosis = initialDiagnosis;
			return this;
		}

		withComplaints(complaints: ComplaintEnum[]): this {
			this.complaints = complaints;
			return this;
		}

		withPetId(petId: IdValue): this {
			this.petId = petId;
			return this;
		}

		withPetName(petName: string): this {
			this.petName = petName;
			return this;
		}

		withPetAge(petAge: string): this {
			this.petAge = petAge;
			return this;
		}

		withPetWeight(petWeight: number): this {
			this.petWeight = petWeight;
			return this;
		}

		withOwnerId(ownerId: IdValue): this {
			this.ownerId = ownerId;
			return this;
		}

		withOwnerName(ownerName: string): this {
			this.ownerName = ownerName;
			return this;
		}

		withContactPerson(contactPerson: ContactPersonValue): this {
			this.contactPerson = contactPerson;
			return this;
		}

		build(): Either<ValidationError, Hospitalization> {
			const result = HOSPITALIZATION_CONSTRUCTOR_SCHEMA.safeParse({
				id: this.id,
				admissionDate: this.admissionDate,
				estimatedDischargeDate: this.estimatedDischargeDate,
				initialDiagnosis: this.initialDiagnosis,
				complaints: this.complaints,
				petId: this.petId,
				petName: this.petName,
				petAge: this.petAge,
				petWeight: this.petWeight,
				ownerId: this.ownerId,
				ownerName: this.ownerName,
				contactPerson: this.contactPerson,
			});

			if (!result.success) {
				const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
				return left(new ValidationError("Hospitalization.Builder", errors));
			}

			const data = result.data;
			return right(
				new Hospitalization(
					data.id,
					data.admissionDate,
					data.estimatedDischargeDate,
					data.initialDiagnosis,
					data.complaints,
					data.petId,
					data.petName,
					data.petAge,
					data.petWeight,
					data.ownerId,
					data.ownerName,
					data.contactPerson,
				),
			);
		}

		rebuild(): Hospitalization {
			const result = HOSPITALIZATION_SCHEMA.safeParse({
				id: this.id,
				admissionDate: this.admissionDate,
				estimatedDischargeDate: this.estimatedDischargeDate,
				initialDiagnosis: this.initialDiagnosis,
				complaints: this.complaints,
				petId: this.petId,
				petName: this.petName,
				petAge: this.petAge,
				petWeight: this.petWeight,
				ownerId: this.ownerId,
				ownerName: this.ownerName,
				contactPerson: this.contactPerson,

				state: this.state,
				actualDiagnosis: this.actualDiagnosis,
				dischargeDate: this.dischargeDate,
				stateAtDischarge: this.stateAtDischarge,
				periodicReports: this.periodicReports,
			});

			if (!result.success) {
				const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
				throw new ValidationError("Hospitalization.Builder", errors);
			}

			const data = result.data;
			const hospitalization = new Hospitalization(
				data.id,
				data.admissionDate,
				data.estimatedDischargeDate,
				data.initialDiagnosis,
				data.complaints,
				data.petId,
				data.petName,
				data.petAge,
				data.petWeight,
				data.ownerId,
				data.ownerName,
				data.contactPerson,
				data.state,
				data.actualDiagnosis,
				data.dischargeDate,
				data.stateAtDischarge,
				data.periodicReports,
			);

			hospitalization.clearUncommitedEvents();
			return hospitalization;
		}
	};
}

export const HOSPITALIZATION_CONSTRUCTOR_SCHEMA = z.object({
	id: z.custom<IdValue>((val) => val instanceof IdValue, "O ID da hospitalização é obrigatório"),
	admissionDate: z.custom<DateValue>(
		(val) => val instanceof DateValue,
		"A data de admissão é obrigatória",
	),
	estimatedDischargeDate: z.custom<DateValue>(
		(val) => val instanceof DateValue,
		"A data estimada de alta é obrigatória",
	),
	initialDiagnosis: z.array(z.enum(DiagnosisEnum))
		.min(1, "Deve haver pelo menos um diagnóstico inicial")
		.max(10, "Não podem haver mais de 10 diagnósticos iniciais"),
	complaints: z.array(z.enum(ComplaintEnum))
		.min(1, "Deve haver pelo menos uma queixa")
		.max(15, "Não podem haver mais de 15 queixas"),
	petId: z.custom<IdValue>((val) => val instanceof IdValue, "O ID do pet é obrigatório"),
	petName: z.string().trim().min(2, "O nome do pet deve ter pelo menos 2 caracteres"),
	petAge: z.string().trim().min(1, "A idade do pet é obrigatória"),
	petWeight: z.number().positive("O peso do pet deve ser maior que zero"),
	ownerId: z.custom<IdValue>((val) => val instanceof IdValue, "O ID do tutor é obrigatório"),
	ownerName: z.string().trim().min(2, "O nome do tutor deve ter pelo menos 2 caracteres"),
	contactPerson: z.custom<ContactPersonValue>(
		(val) => val instanceof ContactPersonValue,
		"A pessoa de contacto é obrigatória",
	),
	state: z.literal(undefined),
}).refine((data) => {
	if (data.admissionDate && data.estimatedDischargeDate) {
		return !data.estimatedDischargeDate.earlierThan(data.admissionDate);
	}
	return true;
}, {
	message: "A data estimada de alta deve ser posterior à data de admissão",
	path: ["admissionDate", "estimatedDischargeDate"],
});

export const HOSPITALIZATION_SCHEMA = HOSPITALIZATION_CONSTRUCTOR_SCHEMA.extend({
	state: z.enum(HospitalizationStateEnum),
	actualDiagnosis: z.array(z.enum(DiagnosisEnum)),
	dischargeDate: z.custom<DateValue>().optional(),
	stateAtDischarge: z.enum(StateAtDischargeEnum).optional(),
	periodicReports: z.custom<PeriodicReport[]>().default([]),
}).refine((data) => {
	if (data.dischargeDate && data.admissionDate) {
		return !data.dischargeDate.earlierThan(data.admissionDate);
	}
	return true;
}, {
	message: "A data de alta deve ser posterior à data de admissão",
});
