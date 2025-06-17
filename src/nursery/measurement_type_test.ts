import { assertEquals, assertExists } from "@deps/assert";
import {
	MeasurementRange,
	MeasurementType,
	MeasurementTypeIdValue,
	MeasurementUnit,
} from "./measurement_type.ts";

Deno.test("MeasurementType - create() should create valid continuous measurement type", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Temperature";
	const unit: MeasurementUnit = "Continuous";
	const description = "Body temperature measurement";
	const normalRange: MeasurementRange = [36.5, 37.5];

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.id, id);
	assertEquals(result.right.name, name);
	assertEquals(result.right.unit, unit);
	assertEquals(result.right.description, description);
	assertEquals(result.right.normalRange, normalRange);
});

Deno.test("MeasurementType - create() should create valid discrete measurement type", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Pain Scale";
	const unit: MeasurementUnit = "Discrete";
	const description = "Pain level assessment";
	const normalRange: MeasurementRange = ["0", "1", "2"];

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.unit, unit);
	assertEquals(result.right.normalRange, normalRange);
});

Deno.test("MeasurementType - create() should create with all ranges", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Heart Rate";
	const unit: MeasurementUnit = "Continuous";
	const description = "Heart rate measurement";
	const normalRange: MeasurementRange = [60, 100];
	const veryLowRange: MeasurementRange = [0, 40];
	const lowRange: MeasurementRange = [40, 60];
	const veryHighRange: MeasurementRange = [120, 200];
	const highRange: MeasurementRange = [100, 120];

	const result = MeasurementType.create(
		id,
		name,
		unit,
		description,
		normalRange,
		veryLowRange,
		lowRange,
		veryHighRange,
		highRange,
	);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.normalRange, normalRange);
	assertEquals(result.right.veryLowRange, veryLowRange);
	assertEquals(result.right.lowRange, lowRange);
	assertEquals(result.right.veryHighRange, veryHighRange);
	assertEquals(result.right.highRange, highRange);
});

Deno.test("MeasurementType - create() should reject empty name", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "";
	const unit: MeasurementUnit = "Continuous";
	const description = "Test description";
	const normalRange: MeasurementRange = [0, 10];

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject name that's too long", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "A".repeat(101); // 101 characters
	const unit: MeasurementUnit = "Continuous";
	const description = "Test description";
	const normalRange: MeasurementRange = [0, 10];

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject empty description", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit: MeasurementUnit = "Continuous";
	const description = "";
	const normalRange: MeasurementRange = [0, 10];

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject description that's too long", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit: MeasurementUnit = "Continuous";
	const description = "A".repeat(501); // 501 characters
	const normalRange: MeasurementRange = [0, 10];

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject invalid continuous range", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit: MeasurementUnit = "Continuous";
	const description = "Test description";
	const normalRange: MeasurementRange = [10, 5]; // max < min

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject empty discrete range", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit: MeasurementUnit = "Discrete";
	const description = "Test description";
	const normalRange: MeasurementRange = []; // empty array

	const result = MeasurementType.create(id, name, unit, description, normalRange);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - recreate() should create without events", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Temperature";
	const unit: MeasurementUnit = "Continuous";
	const description = "Body temperature measurement";
	const normalRange: MeasurementRange = [36.5, 37.5];

	const measurementType = MeasurementType.recreate(id, name, unit, description, normalRange);

	assertExists(measurementType);
	assertEquals(measurementType.id, id);
	assertEquals(measurementType.name, name);
});

Deno.test("MeasurementType - clone() should create identical copy", () => {
	const id = MeasurementTypeIdValue.random();
	const original = MeasurementType.create(
		id,
		"Test Name",
		"Continuous",
		"Test description",
		[0, 10],
		[0, 2],
		[2, 5],
		[15, 20],
		[10, 15],
	).right;

	const clone = original.clone();

	assertEquals(clone.id, original.id);
	assertEquals(clone.name, original.name);
	assertEquals(clone.unit, original.unit);
	assertEquals(clone.description, original.description);
	assertEquals(clone.normalRange, original.normalRange);
	assertEquals(clone.veryLowRange, original.veryLowRange);
	assertEquals(clone.lowRange, original.lowRange);
	assertEquals(clone.veryHighRange, original.veryHighRange);
	assertEquals(clone.highRange, original.highRange);

	// Verify they are separate instances
	assertEquals(clone === original, false);
});

Deno.test("MeasurementType - should handle whitespace in name and description", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "  Test Name  ";
	const description = "  Test description  ";

	const result = MeasurementType.create(id, name, "Continuous", description, [0, 10]);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.name, "Test Name"); // Should be trimmed
	assertEquals(result.right.description, "Test description"); // Should be trimmed
});
