import { assertEquals } from "dev_deps";
import { Hospitalization } from "domain/patients/hospitalizations/hospitalization.ts";
import { SQLiteHospitalizationRepository } from "../../src/persistence/sqlite/sqlite_hospitalization_repository.ts";
import { patient1 } from "../fake_data.ts";
import { init_test_db, populate } from "./test_db.ts";
import { ID } from "shared/id.ts";

Deno.test("SQLite - Hospitalization Repository", async (t) => {
	await t.step("Deve salvar a hospitalização.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteHospitalizationRepository(db);

		const hospitalization = new Hospitalization(
			ID.random(),
			patient1.systemId.value,
			16.68,
			complaints,
			diagnostics,
			"2024-04-09",
		);

		await repository.save(hospitalization);

		const result = await repository.last();

		assertEquals(result.weight, 16.68);
		assertEquals(result.complaints, complaints);
		assertEquals(result.diagnostics, diagnostics);
		assertEquals(result.patientId.value, patient1.systemId.value);
	});

	await t.step("Deve recuperar as hospitalizações abertas", async () => {
		const db = await init_test_db();

		populate(db);

		const hospitalization = new Hospitalization(
			ID.random(),
			patient1.systemId.value,
			16.68,
			complaints,
			diagnostics,
			"2024-04-09",
		);

		const repository = new SQLiteHospitalizationRepository(db);

		await repository.save(hospitalization);

		const hospitalizations = await repository.getAllOpened();

		assertEquals(hospitalizations.length, 2);
		assertEquals(hospitalizations[0].status, "Aberta");
	});
});

const complaints = ["Queimadura", "Dor de cabeça", "Dor de barriga"];
const diagnostics = ["Gripe", "Dor de cabeça", "Dor de barriga"];
