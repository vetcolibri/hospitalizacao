import { assertEquals } from "dev_deps";
import { SQLiteReportService } from "persistence/sqlite/sqlite_report_service.ts";
import { init_test_db, populate } from "./test_db.ts";

Deno.test("SQLite Report Service - Find Reports", async (t) => {
    await t.step("Deve recuperar os **Reports** do paciente", async () => {
        const db = await init_test_db();
        populate(db);

        const service = new SQLiteReportService(db);

        const reports = await service.findAll("1918BA", "some-hospitalization-id");

        assertEquals(reports.length, 2);
    });

    await t.step("O mais recente deve estar em primeiro lugar", async () => {
        const db = await init_test_db();
        populate(db);

        const service = new SQLiteReportService(db);

        const reports = await service.findAll("1918BA", "some-hospitalization-id");

        assertEquals(reports[0].reportId, "2");
    });
});
