import { assertEquals } from "dev_deps";
import {
	type HospitalizationFact,
	type LegacyMapping,
	type LegacyRecordFact,
	validateMapping,
} from "../../tools/legacy_classification/validator.ts";

/**
 * Validador do mapping manual do legado (RF-15/RF-16). Regras que impedem
 * colar dados clínicos ao episódio errado:
 *  - ID inexistente, tipo inválido, campos em falta;
 *  - paciente diferente (do registo e da hospitalização);
 *  - duplicados;
 *  - episódio temporalmente impossível sem override explícito justificado;
 *  - mapping incompleto (sobra legado por classificar).
 */

const AS_OF = new Date("2026-09-15T12:00:00.000Z");

const RECORDS: LegacyRecordFact[] = [
	{
		record_type: "round",
		record_id: "r1",
		system_id: "sysA",
		starts_at: "2026-01-02T09:00:00.000Z",
		ends_at: "2026-01-02T09:00:00.000Z",
	},
	{
		record_type: "report",
		record_id: "p1",
		system_id: "sysA",
		starts_at: "2026-01-03T10:00:00.000Z",
		ends_at: "2026-01-03T10:00:00.000Z",
	},
];

const HOSPITALIZATIONS: HospitalizationFact[] = [
	{
		hospitalization_id: "h1",
		system_id: "sysA",
		entry_date: "2026-01-01T00:00:00.000Z",
		discharge_date: "2026-01-05T00:00:00.000Z",
	},
	{
		hospitalization_id: "hOther",
		system_id: "sysB",
		entry_date: "2026-01-01T00:00:00.000Z",
		discharge_date: null,
	},
];

function mapping(overrides: Partial<LegacyMapping> = {}): LegacyMapping {
	return {
		version: 1,
		approved: true,
		reviewed_by: "medvet1",
		reviewed_at: "2026-09-15T11:00:00.000Z",
		entries: [
			{
				record_type: "round",
				record_id: "r1",
				system_id: "sysA",
				hospitalization_id: "h1",
			},
			{
				record_type: "report",
				record_id: "p1",
				system_id: "sysA",
				hospitalization_id: "h1",
			},
		],
		...overrides,
	};
}

function codes(result: ReturnType<typeof validateMapping>): string[] {
	return result.map((issue) => issue.code);
}

Deno.test("validador do mapping legado", async (t) => {
	await t.step("aceita um mapping completo e temporalmente possível", () => {
		assertEquals(validateMapping(mapping(), RECORDS, HOSPITALIZATIONS, { asOf: AS_OF }), []);
	});

	await t.step("recusa versão desconhecida", () => {
		const result = validateMapping(mapping({ version: 99 }), RECORDS, HOSPITALIZATIONS, {
			asOf: AS_OF,
		});
		assertEquals(codes(result).includes("MAPPING_VERSION_MISMATCH"), true);
	});

	await t.step("recusa mapping por aprovar quando exigido", () => {
		const result = validateMapping(mapping({ approved: false }), RECORDS, HOSPITALIZATIONS, {
			asOf: AS_OF,
			requireApproved: true,
		});
		assertEquals(codes(result).includes("MAPPING_NOT_APPROVED"), true);
	});

	await t.step("recusa ID de registo inexistente", () => {
		const m = mapping();
		m.entries[0].record_id = "nao-existe";
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"RECORD_NOT_FOUND",
			),
			true,
		);
	});

	await t.step("recusa tipo de registo inválido", () => {
		const m = mapping();
		// deno-lint-ignore no-explicit-any
		(m.entries[0] as any).record_type = "exame";
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"INVALID_RECORD_TYPE",
			),
			true,
		);
	});

	await t.step("recusa registo de paciente diferente", () => {
		const m = mapping();
		m.entries[0].system_id = "sysB";
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"PATIENT_MISMATCH",
			),
			true,
		);
	});

	await t.step("recusa hospitalização inexistente", () => {
		const m = mapping();
		m.entries[0].hospitalization_id = "h-inexistente";
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"HOSPITALIZATION_NOT_FOUND",
			),
			true,
		);
	});

	await t.step("recusa hospitalização de outro paciente", () => {
		const m = mapping();
		m.entries[0].hospitalization_id = "hOther";
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"HOSPITALIZATION_PATIENT_MISMATCH",
			),
			true,
		);
	});

	await t.step("recusa registo duplicado", () => {
		const m = mapping();
		m.entries.push({ ...m.entries[0] });
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"DUPLICATE_RECORD",
			),
			true,
		);
	});

	await t.step("recusa episódio temporalmente impossível sem override", () => {
		const m = mapping();
		m.entries[0].hospitalization_id = "hLate";
		const hospitalizations = [
			...HOSPITALIZATIONS,
			{
				hospitalization_id: "hLate",
				system_id: "sysA",
				entry_date: "2026-06-01T00:00:00.000Z",
				discharge_date: null,
			},
		];
		const result = validateMapping(m, RECORDS, hospitalizations, { asOf: AS_OF });
		assertEquals(codes(result).includes("TEMPORALLY_IMPOSSIBLE"), true);
	});

	await t.step("aceita episódio temporalmente impossível com override justificado", () => {
		const m = mapping();
		m.entries[0].hospitalization_id = "hLate";
		m.entries[0].override_reason = "Entrada registada com atraso; confirmado pelo CVL.";
		const hospitalizations = [
			...HOSPITALIZATIONS,
			{
				hospitalization_id: "hLate",
				system_id: "sysA",
				entry_date: "2026-06-01T00:00:00.000Z",
				discharge_date: null,
			},
		];
		assertEquals(validateMapping(m, RECORDS, hospitalizations, { asOf: AS_OF }), []);
	});

	await t.step("recusa mapping incompleto", () => {
		const m = mapping();
		m.entries = [m.entries[0]];
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"MAPPING_INCOMPLETE",
			),
			true,
		);
	});

	await t.step("recusa campos em falta", () => {
		const m = mapping();
		m.entries[0].hospitalization_id = "";
		assertEquals(
			codes(validateMapping(m, RECORDS, HOSPITALIZATIONS, { asOf: AS_OF })).includes(
				"MISSING_FIELD",
			),
			true,
		);
	});
});
