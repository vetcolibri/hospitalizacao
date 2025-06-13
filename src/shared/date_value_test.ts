import { assert, assertEquals, assertThrows } from "@deps/assert";
import { DateValue } from "@shared/date_value.ts";
import { assertInstanceOf } from "@deps/assert/instance-of";
import { ValidationError } from "@shared/validation_error.ts";

Deno.test("DateValue", async (t) => {
	await t.step("Deve criar um DateValue com uma data válida", () => {
		const date = DateValue.fromString("2023-10-01");
		assert(date.isRight());
		assertEquals(date.right.value, "2023-10-01");
	});

	await t.step("Deve retornar o erro ValidationError se a data for inválida", () => {
		const date = DateValue.fromString("2023-10-01T00:00:00Z");
		assert(date.isLeft());
		assertInstanceOf(date.left, ValidationError);
	});

	await t.step("Deve retornar true quando o método earlierThan for chamado com uma data posterior", () => {
	  const date1 = DateValue.fromString("2023-10-01").right;
    const date2 = DateValue.fromString("2023-10-02").right;

    assertEquals(date1.earlierThan(date2), true);
	});

	await t.step("Deve retornar false quando o método earlierThan for chamado com uma data anterior", () => {
	  const date1 = DateValue.fromString("2023-10-02").right;
    const date2 = DateValue.fromString("2023-10-01").right;

    assertEquals(date1.earlierThan(date2), false);
	});

	await t.step("Deve retornar false quando o método earlierThan for chamado com a mesma data", () => {
	  const date1 = DateValue.fromString("2023-10-01").right;
    const date2 = DateValue.fromString("2023-10-01").right;

    assertEquals(date1.earlierThan(date2), false);
	});
});
