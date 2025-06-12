import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";
import { Event, withHeader, withPayload } from "@shared/event.ts";
import { OWNER_CREATED_EVENT_NAME, OwnerCreatedPayload } from "./owner_created_event.ts";
import { OWNER_UPDATED_EVENT_NAME, OwnerUpdatedPayload } from "./owner_updated_event.ts";

export class Owner {
	static create(
		id: IdValue,
		orangestId: OrangestIdValue,
		name: OwnerNameValue,
		phoneNumbers: PhoneNumberValue[],
	): Either<ValidationError, Owner> {
		try {
			return right(new Owner(id, orangestId, name, phoneNumbers));
		} catch (error) {
			return left(error as ValidationError);
		}
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

		if (phoneNumbers.length === 0) {
			throw new ValidationError("Pets.Owner:constructor", [
				"O tutor deve ter pelo menos um número de telefone",
			]);
		}

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
		if (!phoneNumbers || phoneNumbers.length === 0) {
			return left(
				new ValidationError("Pets.Owner:updatePhoneNumbers", [
					"O tutor deve ter pelo menos um número de telefone",
				]),
			);
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
