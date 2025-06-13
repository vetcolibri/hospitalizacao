import { assertEquals } from "@deps/assert";
import { OwnerNameValue } from "./owner_name_value.ts";

Deno.test("OwnerNameValue", async (t) => {
	await t.step(
		"Deve retornar um nome do tutor válido se tiver pelo menos um nome e um sobrenome",
		() => {
			const result = OwnerNameValue.fromString("John Doe");
			assertEquals(result.isRight(), true);
		},
	);

	await t.step(
		"Deve retornar um erro se o nome do tutor não tiver pelo menos um nome e um sobrenome",
		() => {
			const result = OwnerNameValue.fromString("John");
			assertEquals(result.isLeft(), true);
		},
	);

	await t.step("Deve retornar um erro se o nome do tutor tiver menos de 2 letras", () => {
		const result = OwnerNameValue.fromString("Jonh D");
		assertEquals(result.isLeft(), true);
	});
});
