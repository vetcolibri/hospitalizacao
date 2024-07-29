import { ID } from "shared/id.ts";

export class Owner {
	readonly ownerId: ID;
	#name: string;
	#phoneNumber: string;
	#whatsapp: boolean;

	constructor(ownerId: string, name: string, phoneNumber: string, whatsapp?: boolean) {
		this.ownerId = ID.fromString(ownerId);
		this.#name = name;
		this.#phoneNumber = phoneNumber;

		if (!whatsapp) {
			this.#whatsapp = false;
			return;
		}

		this.#whatsapp = whatsapp;
	}

	hasWhatsApp(): boolean {
		return this.#whatsapp === true;
	}

	get name(): string {
		return this.#name;
	}

	get phoneNumber(): string {
		return this.#phoneNumber;
	}

	get whatsapp(): boolean {
		return this.#whatsapp;
	}
}
