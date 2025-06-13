import { assert, assertEquals, assertThrows } from "@deps/assert";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { assertInstanceOf } from "@deps/assert/instance-of";
import { ValidationError } from "@shared/validation_error.ts";

Deno.test("PhoneNumberValue", async (t) => {
	await t.step("Deve criar um PhoneNumberValue válido com número e WhatsApp", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true, "351");
		assert(phoneNumber.isRight());

		const phone = phoneNumber.right;
		assertEquals(phone.number, "912345678");
		assertEquals(phone.whatsapp, true);
		assertEquals(phone.countryCode, "351");
		assertEquals(phone.formattedNumber, "+351912345678");
	});

	await t.step("Deve criar um PhoneNumberValue válido sem WhatsApp", () => {
		const phoneNumber = PhoneNumberValue.create("987654321", false, "55");
		assert(phoneNumber.isRight());

		const phone = phoneNumber.right;
		assertEquals(phone.number, "987654321");
		assertEquals(phone.whatsapp, false);
		assertEquals(phone.countryCode, "55");
		assertEquals(phone.formattedNumber, "+55987654321");
	});

	await t.step("Deve usar código de país padrão 244 quando não especificado", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true);
		assert(phoneNumber.isRight());

		const phone = phoneNumber.right;
		assertEquals(phone.countryCode, "244");
		assertEquals(phone.formattedNumber, "+244912345678");
	});

	await t.step("Deve remover espaços do número de telefone", () => {
		const phoneNumber = PhoneNumberValue.create("91 234 5678", true, "351");
		assert(phoneNumber.isRight());

		const phone = phoneNumber.right;
		assertEquals(phone.number, "912345678");
		assertEquals(phone.formattedNumber, "+351912345678");
	});

	await t.step("Deve aceitar números com 4 dígitos (mínimo)", () => {
		const phoneNumber = PhoneNumberValue.create("1234", true, "1");
		assert(phoneNumber.isRight());

		const phone = phoneNumber.right;
		assertEquals(phone.number, "1234");
		assertEquals(phone.countryCode, "1");
	});

	await t.step("Deve aceitar números com 15 dígitos (máximo)", () => {
		const phoneNumber = PhoneNumberValue.create("123456789012345", true, "1");
		assert(phoneNumber.isRight());

		const phone = phoneNumber.right;
		assertEquals(phone.number, "123456789012345");
	});

	await t.step("Deve retornar erro se o número tiver menos de 4 dígitos", () => {
		const phoneNumber = PhoneNumberValue.create("123", true, "351");
		assert(phoneNumber.isLeft());
		assertInstanceOf(phoneNumber.left, ValidationError);
	});

	await t.step("Deve retornar erro se o número tiver mais de 15 dígitos", () => {
		const phoneNumber = PhoneNumberValue.create("1234567890123456", true, "351");
		assert(phoneNumber.isLeft());
		assertInstanceOf(phoneNumber.left, ValidationError);
	});

	await t.step("Deve retornar erro se o número contiver caracteres não numéricos", () => {
		const phoneNumber = PhoneNumberValue.create("91234abc", true, "351");
		assert(phoneNumber.isLeft());
		assertInstanceOf(phoneNumber.left, ValidationError);
	});

	await t.step("Deve retornar erro se o número estiver vazio", () => {
		const phoneNumber = PhoneNumberValue.create("", true, "351");
		assert(phoneNumber.isLeft());
		assertInstanceOf(phoneNumber.left, ValidationError);
	});

	await t.step("Deve retornar erro se o código de país for inválido (vazio)", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true, "");
		assert(phoneNumber.isLeft());
		assertInstanceOf(phoneNumber.left, ValidationError);
	});

	await t.step("Deve retornar erro se o código de país tiver mais de 3 dígitos", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true, "1234");
		assert(phoneNumber.isLeft());
		assertInstanceOf(phoneNumber.left, ValidationError);
	});

	await t.step("Deve retornar erro se o código de país contiver caracteres não numéricos", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true, "35a");
		assert(phoneNumber.isLeft());
		assertInstanceOf(phoneNumber.left, ValidationError);
	});

	await t.step("Deve aceitar código de país com 1 dígito", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true, "1");
		assert(phoneNumber.isRight());
		assertEquals(phoneNumber.right.countryCode, "1");
	});

	await t.step("Deve aceitar código de país com 3 dígitos", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true, "351");
		assert(phoneNumber.isRight());
		assertEquals(phoneNumber.right.countryCode, "351");
	});

	await t.step("Deve formatar o número corretamente com código de país", () => {
		const phoneNumber = PhoneNumberValue.create("912345678", true, "351");
		assert(phoneNumber.isRight());
		assertEquals(phoneNumber.right.formattedNumber, "+351912345678");
	});
});
