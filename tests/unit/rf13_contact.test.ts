import { assert, assertEquals } from "dev_deps";
import { Contact } from "domain/hospitalization/contact.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationBuilder } from "domain/hospitalization/hospitalization_builder.ts";

/**
 * RF-13 — Contacto específico opcional por hospitalização.
 *
 * O contacto da excepção é validado num único sítio (o value object `Contact`) e
 * transportado pela hospitalização sem tocar no tutor principal.
 */

const VALID_CONTACT = { name: "Maria José", phoneNumber: "923456789", whatsapp: true };

function build(contact?: typeof VALID_CONTACT) {
	return new HospitalizationBuilder()
		.withPatientId("sys-1")
		.withEntryDate("2021-01-01")
		.withWeight(16.5)
		.withComplaints(["Queixa 1"])
		.withDiagnostics(["Diagnostico 1"])
		.withContact(contact)
		.build();
}

function restore(contact?: typeof VALID_CONTACT) {
	return Hospitalization.restore({
		hospitalizationId: "hosp-1",
		patientId: "sys-1",
		weight: 16.5,
		complaints: ["Queixa 1"],
		diagnostics: ["Diagnostico 1"],
		entryDate: "2021-01-01",
		status: "Aberta",
		contact,
	});
}

Deno.test("RF-13 - contacto específico", async (t) => {
	await t.step(
		"aceita nome, telefone angolano válido e indicação explícita de WhatsApp",
		() => {
			const result = Contact.create(VALID_CONTACT);

			assert(result.isRight(), "Deve aceitar um contacto válido.");
			assertEquals(result.value.name, "Maria José");
			assertEquals(result.value.phoneNumber, "923456789");
			assertEquals(result.value.whatsapp, true);
		},
	);

	await t.step("normaliza o nome removendo espaços em excesso", () => {
		const result = Contact.create({ ...VALID_CONTACT, name: "  Maria José  " });

		assert(result.isRight());
		assertEquals(result.value.name, "Maria José");
	});

	await t.step("recusa nome vazio por não haver contacto a usar", () => {
		const result = Contact.create({ ...VALID_CONTACT, name: "   " });

		assert(result.isLeft(), "Sem nome não existe contacto.");
	});

	await t.step("recusa telefone que não seja angolano válido", () => {
		for (const phoneNumber of ["123456789", "823456789", "92345678", "telefone"]) {
			const result = Contact.create({ ...VALID_CONTACT, phoneNumber });

			assert(result.isLeft(), `Deve recusar ${phoneNumber}.`);
		}
	});

	await t.step("recusa WhatsApp ausente ou não booleano", () => {
		const missing = Contact.create({
			name: VALID_CONTACT.name,
			phoneNumber: VALID_CONTACT.phoneNumber,
		} as never);
		const notBoolean = Contact.create({ ...VALID_CONTACT, whatsapp: "sim" } as never);

		assert(missing.isLeft(), "O WhatsApp tem de ser explícito.");
		assert(notBoolean.isLeft(), "O WhatsApp tem de ser booleano.");
	});

	await t.step("o builder transporta o contacto para a hospitalização", () => {
		const result = build(VALID_CONTACT);

		assert(result.isRight(), "Deve construir a hospitalização.");
		assertEquals(result.value.contact?.name, VALID_CONTACT.name);
		assertEquals(result.value.contact?.phoneNumber, VALID_CONTACT.phoneNumber);
		assertEquals(result.value.contact?.whatsapp, VALID_CONTACT.whatsapp);
	});

	await t.step("sem excepção a hospitalização não guarda contacto próprio", () => {
		const result = build();

		assert(result.isRight());
		assertEquals(result.value.contact, undefined);
	});

	await t.step("o builder recusa um contacto inválido sem construir nada", () => {
		const result = build({ ...VALID_CONTACT, phoneNumber: "12345" });

		assert(result.isLeft(), "Um contacto inválido não pode ser aceite.");
	});

	await t.step("restore preserva o contacto gravado", () => {
		const hospitalization = restore(VALID_CONTACT);

		assertEquals(hospitalization.contact?.name, VALID_CONTACT.name);
		assertEquals(hospitalization.contact?.phoneNumber, VALID_CONTACT.phoneNumber);
		assertEquals(hospitalization.contact?.whatsapp, VALID_CONTACT.whatsapp);
	});

	await t.step("restore de uma hospitalização sem excepção não inventa contacto", () => {
		assertEquals(restore().contact, undefined);
	});
});
