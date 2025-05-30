import { IdValue } from "@shared/id_value.ts";
import { assertEquals } from "@deps/assert";

Deno.test("Id Value", async (t) => {
	await t.step("Deve criar um IdValue com um valor válido", () => {
		const id = IdValue.fromString("123A5z78");
		assertEquals(id.isRight(), true);
	});

	await t.step("Deve criar um id aleatório válido", () => {
		const id = IdValue.random();
		const idOrError = IdValue.fromString(id.value);
		assertEquals(idOrError.isRight(), true);
	});

	await t.step("Deve retornar um erro quando o valor do IdValue for inválido", () => {
		const invalidIds = ["1234567", "123456789", "423a_567", "a34567a", "1234567!", "1234567@"];

		invalidIds.forEach((id) => {
			const idOrError = IdValue.fromString(id);
			assertEquals(idOrError.isLeft(), true, `Id ${id} should be invalid`);
		});
	});
});
