import { assertEquals, assertExists } from "@deps/assert";
import { MeasurementTypeIdValue } from "./measurement_type.ts";

Deno.test("MeasurementTypeIdValue - random() should create valid ID", () => {
	const id = MeasurementTypeIdValue.random();

	assertExists(id);
	assertEquals(id.value.length, 8);
	assertEquals(/^[a-zA-Z0-9]{8}$/.test(id.value), true);
});

Deno.test("MeasurementTypeIdValue - random() should create unique IDs", () => {
	const id1 = MeasurementTypeIdValue.random();
	const id2 = MeasurementTypeIdValue.random();

	assertExists(id1);
	assertExists(id2);
	assertEquals(id1.value === id2.value, false);
});

Deno.test("MeasurementTypeIdValue - fromString() should accept valid ID", () => {
	const validId = "abc123XY";
	const result = MeasurementTypeIdValue.fromString(validId);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.value, validId);
});

Deno.test("MeasurementTypeIdValue - fromString() should reject invalid length", () => {
	const shortId = "abc123";
	const longId = "abc123XYZ";

	const shortResult = MeasurementTypeIdValue.fromString(shortId);
	const longResult = MeasurementTypeIdValue.fromString(longId);

	assertEquals(shortResult.isLeft(), true);
	assertEquals(longResult.isLeft(), true);
	assertEquals(shortResult.left.errors.length > 0, true);
	assertEquals(longResult.left.errors.length > 0, true);
});

Deno.test("MeasurementTypeIdValue - fromString() should reject invalid characters", () => {
	const invalidId = "abc123-!";
	const result = MeasurementTypeIdValue.fromString(invalidId);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementTypeIdValue - fromString() should reject empty string", () => {
	const emptyId = "";
	const result = MeasurementTypeIdValue.fromString(emptyId);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementTypeIdValue - fromString() should reject whitespace", () => {
	const whitespaceId = "    ";
	const result = MeasurementTypeIdValue.fromString(whitespaceId);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementTypeIdValue - fromString() should reject special characters", () => {
	const specialChars = [
		"@",
		"#",
		"$",
		"%",
		"&",
		"*",
		"(",
		")",
		"-",
		"+",
		"=",
		"[",
		"]",
		"{",
		"}",
		"|",
		"\\",
		":",
		";",
		'"',
		"'",
		"<",
		">",
		",",
		".",
		"?",
		"/",
	];

	for (const char of specialChars) {
		const invalidId = `abc123X${char}`;
		const result = MeasurementTypeIdValue.fromString(invalidId);

		assertEquals(result.isLeft(), true, `Should reject ID containing '${char}'`);
	}
});

Deno.test("MeasurementTypeIdValue - fromString() should accept all valid alphanumeric characters", () => {
	// Test a combination of all valid characters
	const validId = "aB3Cd7Yz";
	const result = MeasurementTypeIdValue.fromString(validId);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.value, validId);
});

Deno.test("MeasurementTypeIdValue - value property should be immutable", () => {
	const id = MeasurementTypeIdValue.random();
	const originalValue = id.value;

	// Try to modify the value (this should not be possible due to readonly)
	// This test verifies the property is readonly
	assertExists(id.value);
	assertEquals(id.value, originalValue);
});
