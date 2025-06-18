import { assertEquals, assertExists } from "@deps/assert";
import {
	MeasumentRanges,
	MeasurementRange,
	MeasurementType,
	MeasurementTypeIdValue,
	MeasurementUnitType,
} from "./measurement_type.ts";

Deno.test("MeasurementType - create() should create valid continuous measurement type", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Temperature";
	const unit = "°C";
	const unitType: MeasurementUnitType = "Continuous";
	const normalRange: MeasurementRange = ["Normal", [36.5, 37.5]];
	const ranges: MeasumentRanges = {
		normal: normalRange,
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.id, id);
	assertEquals(result.right.name, name);
	assertEquals(result.right.unit, unit);
	assertEquals(result.right.unitType, unitType);
	assertEquals(result.right.ranges.normal, normalRange);
});

Deno.test("MeasurementType - create() should create valid discrete measurement type", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Pain Scale";
	const unit = "scale";
	const unitType: MeasurementUnitType = "Discrete";
	const normalRange: MeasurementRange = ["Pain Level", ["0", "1", "2"]];
	const ranges: MeasumentRanges = {
		normal: normalRange,
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.unitType, unitType);
	assertEquals(result.right.ranges.normal, normalRange);
});

Deno.test("MeasurementType - create() should create with all ranges", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Heart Rate";
	const unit = "bpm";
	const unitType: MeasurementUnitType = "Continuous";
	const normalRange: MeasurementRange = ["Normal", [60, 100]];
	const veryLowRange: MeasurementRange = ["Very Low", [0, 40]];
	const lowRange: MeasurementRange = ["Low", [40, 60]];
	const veryHighRange: MeasurementRange = ["Very High", [120, 200]];
	const highRange: MeasurementRange = ["High", [100, 120]];
	const ranges: MeasumentRanges = {
		normal: normalRange,
		veryLow: veryLowRange,
		low: lowRange,
		veryHigh: veryHighRange,
		high: highRange,
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.ranges.normal, normalRange);
	assertEquals(result.right.ranges.veryLow, veryLowRange);
	assertEquals(result.right.ranges.low, lowRange);
	assertEquals(result.right.ranges.veryHigh, veryHighRange);
	assertEquals(result.right.ranges.high, highRange);
});

Deno.test("MeasurementType - create() should reject empty name", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "";
	const unit = "unit";
	const unitType: MeasurementUnitType = "Continuous";
	const ranges: MeasumentRanges = {
		normal: ["Normal", [0, 10]],
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject name that's too long", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "A".repeat(101); // 101 characters
	const unit = "unit";
	const unitType: MeasurementUnitType = "Continuous";
	const ranges: MeasumentRanges = {
		normal: ["Normal", [0, 10]],
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject empty description", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit = "";
	const unitType: MeasurementUnitType = "Continuous";
	const ranges: MeasumentRanges = {
		normal: ["Normal", [0, 10]],
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject description that's too long", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit = "A".repeat(501); // 501 characters
	const unitType: MeasurementUnitType = "Continuous";
	const ranges: MeasumentRanges = {
		normal: ["Normal", [0, 10]],
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject invalid continuous range", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit = "unit";
	const unitType: MeasurementUnitType = "Continuous";
	const ranges: MeasumentRanges = {
		normal: ["Invalid", [10, 5]], // max < min
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - create() should reject empty discrete range", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Test Name";
	const unit = "scale";
	const unitType: MeasurementUnitType = "Discrete";
	const ranges: MeasumentRanges = {
		normal: ["Empty", []], // empty array
	};

	const result = MeasurementType.create(id, name, unit, unitType, ranges);

	assertEquals(result.isLeft(), true);
	assertEquals(result.left.errors.length > 0, true);
});

Deno.test("MeasurementType - recreate() should create without events", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "Temperature";
	const unit = "°C";
	const unitType: MeasurementUnitType = "Continuous";
	const ranges: MeasumentRanges = {
		normal: ["Normal", [36.5, 37.5]],
	};

	const measurementType = MeasurementType.recreate(id, name, unit, unitType, ranges);

	assertExists(measurementType);
	assertEquals(measurementType.id, id);
	assertEquals(measurementType.name, name);
});

Deno.test("MeasurementType - clone() should create identical copy", () => {
	const id = MeasurementTypeIdValue.random();
	const ranges: MeasumentRanges = {
		normal: ["Normal", [0, 10]],
		veryLow: ["Very Low", [0, 2]],
		low: ["Low", [2, 5]],
		veryHigh: ["Very High", [15, 20]],
		high: ["High", [10, 15]],
	};
	const original = MeasurementType.create(
		id,
		"Test Name",
		"unit",
		"Continuous",
		ranges,
	).right!;

	const clone = original.clone();

	assertEquals(clone.id, original.id);
	assertEquals(clone.name, original.name);
	assertEquals(clone.unit, original.unit);
	assertEquals(clone.unitType, original.unitType);
	assertEquals(clone.ranges, original.ranges);

	// Verify they are separate instances
	assertEquals(clone === original, false);
});

Deno.test("MeasurementType - should handle whitespace in name and description", () => {
	const id = MeasurementTypeIdValue.random();
	const name = "  Test Name  ";
	const unit = "  unit  ";
	const ranges: MeasumentRanges = {
		normal: ["Normal", [0, 10]],
	};

	const result = MeasurementType.create(id, name, unit, "Continuous", ranges);

	assertEquals(result.isRight(), true);
	assertEquals(result.right.name, "Test Name"); // Should be trimmed
	assertEquals(result.right.unit, "unit"); // Should be trimmed
});
