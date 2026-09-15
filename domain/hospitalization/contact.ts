import { Either, left, right } from "shared/either.ts";

const ANGOLAN_PHONE = /^9[1-9]\d{7}$/;
const CONTACT_NAME_MAX = 50;

export interface ContactData {
	name: string;
	phoneNumber: string;
	whatsapp: boolean;
}

/**
 * Contacto específico de uma hospitalização (RF-13).
 *
 * É o ÚNICO sítio onde a excepção é validada e normalizada: nome obrigatório,
 * telefone angolano válido e indicação explícita de WhatsApp. O contacto
 * pertence ao episódio e nunca reescreve a ficha global do tutor.
 */
export class Contact {
	readonly name: string;
	readonly phoneNumber: string;
	readonly whatsapp: boolean;

	private constructor(name: string, phoneNumber: string, whatsapp: boolean) {
		this.name = name;
		this.phoneNumber = phoneNumber;
		this.whatsapp = whatsapp;
	}

	static create(data: ContactData): Either<Error, Contact> {
		const name = data?.name?.trim() ?? "";
		if (!name) return left(new Error("O nome do contacto é obrigatório."));

		if (name.length > CONTACT_NAME_MAX) {
			return left(
				new Error(
					`O nome do contacto não pode ter mais de ${CONTACT_NAME_MAX} caracteres.`,
				),
			);
		}

		if (!ANGOLAN_PHONE.test(data?.phoneNumber ?? "")) {
			return left(new Error("Insira um número de telefone angolano válido."));
		}

		if (typeof data?.whatsapp !== "boolean") {
			return left(new Error("Indique se o contacto tem WhatsApp."));
		}

		return right(new Contact(name, data.phoneNumber, data.whatsapp));
	}

	/**
	 * Reconstitui um contacto já validado e gravado, sem revalidar.
	 */
	static restore(data: ContactData): Contact {
		return new Contact(data.name, data.phoneNumber, data.whatsapp);
	}
}
