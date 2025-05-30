import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { Either, left, right } from "@shared/either.ts";

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
			throw new ValidationError("Owner", ["O tutor deve ter pelo menos um número de telefone"]);
		}
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
	}

	changeOrangestId(orangestId: OrangestIdValue): void {
		this.#orangestId = orangestId;
	}

	updatePhoneNumbers(phoneNumbers: PhoneNumberValue[]): Either<ValidationError, void> {
		if (!phoneNumbers || phoneNumbers.length === 0) {
			return left(
				new ValidationError("Owner:updatePhoneNumbers", [
					"O tutor deve ter pelo menos um número de telefone",
				]),
			);
		}

		this.#phoneNumbers = phoneNumbers;
		return right(undefined);
	}

	clone(): Owner {
		return new Owner(this.#id, this.#orangestId, this.#name, this.#phoneNumbers);
	}
}
