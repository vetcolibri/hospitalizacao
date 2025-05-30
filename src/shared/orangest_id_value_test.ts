import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { assertEquals } from "@deps/assert";

Deno.test("OrangestIdValue", async (t) => {
	await t.step("Deve criar um OrangestIdValue válido", () => {
		const orangestId = OrangestIdValue.fromString("12345A");
		assertEquals(orangestId.isRight(), true);
	});

	await t.step("Deve retornar um erro quando o ID Orangest for inválido", () => {
		const invalidIds = ["1234A", "123456", "A12345", "74234a"];

		invalidIds.forEach((id) => {
			const orangestId = OrangestIdValue.fromString(id);
			assertEquals(orangestId.isLeft(), true, `ID: ${id} expected to be invalid`);
		});
	});
});
