import { assertEquals, assertInstanceOf } from "dev_deps";
import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { ReportNotFound } from "domain/crm/report/report_not_found_error.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { SQLiteReportRepository } from "persistence/sqlite/sqlite_report_repository.ts";
import { ID } from "shared/id.ts";
import { init_test_db, populate } from "./test_db.ts";

Deno.test("SQLite Report Repository - Save", async (t) => {
	await t.step(
		"Deve salvar o **Report** do paciente para o Tutor na base de dados",
		async () => {
			const db = await init_test_db();
			populate(db);

			const reportRepository: ReportRepository = new SQLiteReportRepository(db);

			await reportRepository.save(report);

			const savedReport = await reportRepository.get(report.patientId);

			assertEquals(savedReport.patientId.value, report.patientId.value);
		},
	);
});

Deno.test("SQLite Report Repository - Last", async (t) => {
	await t.step("Deve recuperar o ultimo **Report** do paciente", async () => {
		const db = await init_test_db();
		populate(db);
		const reportRepository: ReportRepository = new SQLiteReportRepository(db);
		await reportRepository.save(report);
		await reportRepository.save(report1);

		const reportOrErr = await reportRepository.last(ID.fromString("1918BA"));

		const lastReport = <Report> reportOrErr.value;

		assertEquals(lastReport.patientId.value, report1.patientId.value);
		assertEquals(lastReport.stateOfConsciousness, report1.stateOfConsciousness);
	});

	await t.step("Deve retornar @ReportNotFound se não encontrar o **Report**", async () => {
		const db = await init_test_db();
		populate(db);

		const reportRepository: ReportRepository = new SQLiteReportRepository(db);

		const reportOrErr = await reportRepository.last(ID.fromString("1918BA"));

		assertEquals(reportOrErr.isLeft(), true);
		assertInstanceOf(reportOrErr.value, ReportNotFound);
	});
});

const stateOfConsiousness = ["Alerta"];
const food = new Food(["Ração"], "1", "2021-09-01T00:00:00Z");
const discharge = new Discharge("Urina", "Normal");
const comments = "Comentários";
const report = new Report(
	ID.random(),
	ID.fromString("1918BA"),
	stateOfConsiousness,
	food,
	discharge,
	comments,
);

const report1 = new Report(
	ID.random(),
	ID.fromString("1918BA"),
	["Consciente"],
	food,
	discharge,
	comments,
);
