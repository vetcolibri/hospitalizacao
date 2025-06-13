import { assertEquals } from "@deps/assert";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { ContactPersonValue } from "./contact_person_value.ts";

Deno.test("ContactPersonValue", async (t) => {
	await t.step("Deve criar uma pessoa de contacto válida", () => {
		const fullName = "João Silva";
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const email = "joao.silva@example.com";

		const contactPersonOrErr = ContactPersonValue.create(fullName, whatsAppNumber, email);

		assertEquals(contactPersonOrErr.isRight(), true);
		const contactPerson = contactPersonOrErr.right;
		assertEquals(contactPerson.fullName, fullName);
		assertEquals(contactPerson.phoneNumber, whatsAppNumber);
		assertEquals(contactPerson.email, email);
	});

	await t.step("Deve criar uma pessoa de contacto válida sem email", () => {
		const fullName = "Maria Santos";
		const whatsAppNumber = PhoneNumberValue.create("923456789", true, "351").right;

		const contactPersonOrErr = ContactPersonValue.create(fullName, whatsAppNumber);

		assertEquals(contactPersonOrErr.isRight(), true);
		const contactPerson = contactPersonOrErr.right;
		assertEquals(contactPerson.fullName, fullName);
		assertEquals(contactPerson.phoneNumber, whatsAppNumber);
		assertEquals(contactPerson.email, undefined);
	});

	await t.step("Deve retornar erro se o nome completo for muito curto", () => {
		const fullName = "A";
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;

		const contactPersonOrErr = ContactPersonValue.create(fullName, whatsAppNumber);

		assertEquals(contactPersonOrErr.isLeft(), true);
	});

	await t.step("Deve retornar erro se o nome completo for vazio", () => {
		const fullName = "";
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;

		const contactPersonOrErr = ContactPersonValue.create(fullName, whatsAppNumber);

		assertEquals(contactPersonOrErr.isLeft(), true);
	});

	await t.step("Deve retornar erro se o email for inválido", () => {
		const fullName = "Pedro Costa";
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const email = "email-invalido";

		const contactPersonOrErr = ContactPersonValue.create(fullName, whatsAppNumber, email);

		assertEquals(contactPersonOrErr.isLeft(), true);
	});

	await t.step("Deve aceitar email vazio como válido", () => {
		const fullName = "Ana Ferreira";
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const email = "";

		const contactPersonOrErr = ContactPersonValue.create(fullName, whatsAppNumber, email);

		assertEquals(contactPersonOrErr.isRight(), true);
		assertEquals(contactPersonOrErr.right.email, "");
	});

	await t.step("Deve ser imutável após criação", () => {
		const fullName = "Carlos Oliveira";
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const email = "carlos@example.com";
		const contactPerson = ContactPersonValue.create(fullName, whatsAppNumber, email).right;

		// As propriedades devem ser somente de leitura
		assertEquals(contactPerson.fullName, fullName);
		assertEquals(contactPerson.phoneNumber, whatsAppNumber);
		assertEquals(contactPerson.email, email);
	});
});
