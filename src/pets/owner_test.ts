import { assertEquals } from "@deps/assert";
import { IdValue } from "@shared/id_value.ts";
import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { Owner } from "./owner.ts";

Deno.test("Owner", async (t) => {
	await t.step("Deve criar um Owner válido", () => {
		const id = IdValue.random();
		const orangestId = OrangestIdValue.fromString("12345A").right;
		const name = OwnerNameValue.fromString("John Doe").right;
		const phoneNumbers = [PhoneNumberValue.create("123456789", true, "1").right];

		const ownerOrErr = Owner.create(id, orangestId, name, phoneNumbers);

		assertEquals(ownerOrErr.isRight(), true);
		const owner = ownerOrErr.right;
		assertEquals(owner.id, id);
		assertEquals(owner.orangestId, orangestId);
		assertEquals(owner.name, name);
		assertEquals(owner.phoneNumbers, phoneNumbers);
	});

	await t.step("Deve retornar um erro se não tiver pelo menos um número de telefone", () => {
		const id = IdValue.random();
		const orangestId = OrangestIdValue.fromString("12345A").right;
		const name = OwnerNameValue.fromString("John Doe").right;
		const phoneNumbers: PhoneNumberValue[] = [];

		const ownerOrErr = Owner.create(id, orangestId, name, phoneNumbers);

		assertEquals(ownerOrErr.isLeft(), true);
	});
});
