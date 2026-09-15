import { assertEquals } from "dev_deps";
import { Client } from "deps";
import { PostgresReportService } from "persistence/postgres/postgres_report_service.ts";

Deno.test("reports are scoped to a hospitalization and ordered newest first", async () => {
	let query = "";
	let parameters: Record<string, string> = {};
	const client = {
		queryObject(sql: string, values: Record<string, string>) {
			query = sql;
			parameters = values;
			return Promise.resolve({ rows: [] });
		},
	} as unknown as Client;

	await new PostgresReportService(client).findAll("patient-1", "hospitalization-1");

	assertEquals(query.includes("reports.hospitalization_id = $HOSPITALIZATION_ID"), true);
	assertEquals(query.includes("ORDER BY reports.created_at DESC, reports.report_id DESC"), true);
	assertEquals(parameters, {
		patient_id: "patient-1",
		hospitalization_id: "hospitalization-1",
	});
});
