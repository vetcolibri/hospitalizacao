import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { Event, withHeader, withPayload } from "@shared/event.ts";
import { OWNER_CREATED_EVENT_NAME, OwnerCreatedPayload } from "./owner_created_event.ts";
import { OWNER_UPDATED_EVENT_NAME, OwnerUpdatedPayload } from "./owner_updated_event.ts";
import { z } from "@deps/zod";

const phoneNumbersSchema = z.array(
	z.custom<PhoneNumberValue>(
		(val) => val instanceof PhoneNumberValue,
		"Número de telefone inválido",
	),
).min(1, "O tutor deve ter pelo menos um número de telefone");

export class Owner {
	static readonly schema = z.object({
		id: z.custom((val) => val instanceof IdValue, "ID inválido"),
		orangestId: z.custom((val) => val instanceof OrangestIdValue, "ID Orangest inválido"),
		name: z.custom((val) => val instanceof OwnerNameValue, "Nome inválido"),
		phoneNumbers: z.array(
			z.custom<PhoneNumberValue>(
				(val) => val instanceof PhoneNumberValue,
				"Número de telefone inválido",
			),
		).min(1, "O tutor deve ter pelo menos um número de telefone"),
	}).transform((data) => new Owner(data.id, data.orangestId, data.name, data.phoneNumbers));

	static create(
		id: IdValue,
		orangestId: OrangestIdValue,
		name: OwnerNameValue,
		phoneNumbers: PhoneNumberValue[],
	): Either<ValidationError, Owner> {
		// Validate constructor parameters using Zod
		const result = Owner.schema.safeParse({
			id,
			orangestId,
			name,
			phoneNumbers,
		});

		if (!result.success) {
			const errors = result.error.errors.map((err) => err.message);
			return left(new ValidationError("Owner", errors));
		}

		return right(result.data);
	}

	readonly #id: IdValue;
	#orangestId: OrangestIdValue;
	#name: OwnerNameValue;
	#phoneNumbers: PhoneNumberValue[];

	#uncommitedEvents: Event<OwnerCreatedPayload | OwnerUpdatedPayload>[];

	private constructor(
		id: IdValue,
		orangestId: OrangestIdValue,
		name: OwnerNameValue,
		phoneNumbers: PhoneNumberValue[],
	) {
		this.#id = id;
		this.#orangestId = orangestId;
		this.#name = name;
		this.#phoneNumbers = phoneNumbers;

		this.#uncommitedEvents = [];
		this.#uncommitedEvents.push(this.#createOwnerCreatedEvent(this));
	}

	get id(): IdValue {
		return this.#id;
	}

	get orangestId(): OrangestIdValue {
		return this.#orangestId;
	}

	get name(): OwnerNameValue {
		return this.#name;
	}

	get phoneNumbers(): PhoneNumberValue[] {
		return this.#phoneNumbers;
	}

	changeName(name: OwnerNameValue): void {
		this.#name = name;

		const evt = this.#createOwnerUpdatedEvent({
			id: this.id,
			name: this.name,
		});
		this.#uncommitedEvents.push(evt);
	}

	changeOrangestId(orangestId: OrangestIdValue): void {
		this.#orangestId = orangestId;

		const evt = this.#createOwnerUpdatedEvent({
			id: this.id,
			orangestId: this.orangestId,
		});

		this.#uncommitedEvents.push(evt);
	}

	updatePhoneNumbers(phoneNumbers: PhoneNumberValue[]): Either<ValidationError, void> {
		const validationResult = phoneNumbersSchema.safeParse(phoneNumbers);

		if (!validationResult.success) {
			const errors = validationResult.error.errors.map((err) => err.message);
			return left(new ValidationError("Pets.Owner:updatePhoneNumbers", errors));
		}

		this.#phoneNumbers = phoneNumbers;

		const evt = this.#createOwnerUpdatedEvent({
			id: this.id,
			phoneNumbers: this.phoneNumbers,
		});

		this.#uncommitedEvents.push(evt);

		return right(undefined);
	}

	clone(): Owner {
		return new Owner(this.#id, this.#orangestId, this.#name, this.#phoneNumbers);
	}

	clearUncommitedEvents(): Event<OwnerCreatedPayload | OwnerUpdatedPayload>[] {
		const oldEvents = this.#uncommitedEvents;
		this.#uncommitedEvents = [];

		return oldEvents;
	}

	#createOwnerCreatedEvent(
		owner: Owner,
	) {
		return Event.create<OwnerCreatedPayload>(
			OWNER_CREATED_EVENT_NAME,
			withHeader("AggregateType", "pets.Owner"),
			withHeader("AggregateId", owner.id.value),
			withPayload({
				orangestId: owner.orangestId.value,
				name: owner.name.value,
				phoneNumbers: owner.phoneNumbers.map((n) => n.formattedNumber),
			}),
		);
	}

	#createOwnerUpdatedEvent(
		data: {
			id: IdValue;
			name?: OwnerNameValue;
			orangestId?: OrangestIdValue;
			phoneNumbers?: PhoneNumberValue[];
		},
	): Event<OwnerUpdatedPayload> {
		return Event.create<OwnerUpdatedPayload>(
			OWNER_UPDATED_EVENT_NAME,
			withHeader("AggregateType", "pets.Owner"),
			withHeader("AggregateId", data.id.value),
			withPayload({
				name: data.name?.value,
				orangestId: data.orangestId?.value,
				phoneNumbers: data.phoneNumbers?.map((n) => n.formattedNumber),
			} as OwnerUpdatedPayload),
		);
	}
}
