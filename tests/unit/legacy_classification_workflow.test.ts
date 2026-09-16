import { assertEquals } from "dev_deps";
import { buildExport } from "../../tools/legacy_classification/export_legacy.ts";
import { planApplication } from "../../tools/legacy_classification/apply_mapping.ts";
import type {
	HospitalizationFact,
	LegacyMapping,
	LegacyRecordFact,
} from "../../tools/legacy_classification/validator.ts";

/**
 * Guardas do workflow de classificação do legado:
 *  - o export não pode conter PII nem conteúdo clínico;
 *  - o plano só existe a partir de mapping aprovado, validado contra os factos
 *    actuais, e nunca escreve (a escrita está atrás de --apply).
 */

const AS_OF = new Date("2026-09-15T12:00:00.000Z");

const RECORDS: LegacyRecordFact[] = [
	{
		record_type: "round",
		record_id: "r1",
		system_id: "sysA",
		starts_at: "2026-01-02T09:00:00",
		ends_at: "2026-01-02T09:00:00",
	},
	{
		record_type: "report",
		record_id: "p1",
		system_id: "sysA",
		starts_at: "2026-01-03T10:00:00",
		ends_at: "2026-01-03T10:00:00",
	},
];

const HOSPITALIZATIONS: HospitalizationFact[] = [
	{
		hospitalization_id: "h1",
		system_id: "sysA",
		entry_date: "2026-01-01T00:00:00",
		discharge_date: "2026-01-05T00:00:00",
	},
];

function approvedMapping(): LegacyMapping {
	return {
		version: 1,
		approved: true,
		reviewed_by: "medvet1",
		reviewed_at: "2026-09-15T11:00:00.000Z",
		entries: [
			{ record_type: "round", record_id: "r1", system_id: "sysA", hospitalization_id: "h1" },
			{ record_type: "report", record_id: "p1", system_id: "sysA", hospitalization_id: "h1" },
		],
	};
}

Deno.test("workflow de classificação do legado", async (t) => {
	await t.step("o export só expõe identificadores, system_id e timestamps", () => {
		const output = buildExport({ records: RECORDS, hospitalizations: HOSPITALIZATIONS }, AS_OF);
		const serialized = JSON.stringify(output);

		for (
			const forbidden of [
				"name",
				"phone",
				"comments",
				"state_of_consciousness",
				"food_types",
				"discharges",
				"aspects",
				"patient_id",
				"owner",
			]
		) {
			assertEquals(
				serialized.includes(forbidden),
				false,
				`o export não pode conter "${forbidden}"`,
			);
		}

		assertEquals(output.counts.total, 2);
		assertEquals(output.records[0].candidates, ["h1"]);
	});

	await t.step("mapping aprovado e completo devolve plano, sem escrever", () => {
		const plan = planApplication(approvedMapping(), RECORDS, HOSPITALIZATIONS, AS_OF);

		assertEquals(plan.issues, []);
		assertEquals(plan.updates.length, 2);
	});

	await t.step("mapping por aprovar é recusado e não gera plano", () => {
		const plan = planApplication(
			{ ...approvedMapping(), approved: false },
			RECORDS,
			HOSPITALIZATIONS,
			AS_OF,
		);

		assertEquals(plan.updates, []);
		assertEquals(plan.issues.some((issue) => issue.code === "MAPPING_NOT_APPROVED"), true);
	});

	await t.step("mapping incompleto é recusado e não gera plano", () => {
		const mapping = approvedMapping();
		mapping.entries = [mapping.entries[0]];

		const plan = planApplication(mapping, RECORDS, HOSPITALIZATIONS, AS_OF);

		assertEquals(plan.updates, []);
		assertEquals(plan.issues.some((issue) => issue.code === "MAPPING_INCOMPLETE"), true);
	});
});
