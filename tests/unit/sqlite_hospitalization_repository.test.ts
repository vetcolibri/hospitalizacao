import { assertEquals, assertInstanceOf } from "dev_deps";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { SQLiteHospitalizationRepository } from "persistence/sqlite/sqlite_hospitalization_repository.ts";
import { ID } from "shared/id.ts";
import { hospitalizationData } from "../fake_data.ts";
import { init_test_db, populate } from "./test_db.ts";

Deno.test("SQLite - Hospitalization Repository", async (t) => {
	await t.step("Deve salvar a hospitalização.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteHospitalizationRepository(db);

		const hospitalization = new Hospitalization(
			ID.random(),
			"1918BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
		);

		await repository.save(hospitalization);

		const result = await repository.last();

		assertEquals(result.patientId.value, "1918BA");
		assertEquals(result.weight, 16.5);
		assertEquals(result.complaints, hospitalizationData.complaints);
		assertEquals(result.diagnostics, hospitalizationData.diagnostics);
	});

	await t.step("Deve recuperar as hospitalizações", async () => {
		const db = await init_test_db();

		populate(db);

		const hospitalization = new Hospitalization(
			ID.random(),
			"1918BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
		);

		const repository = new SQLiteHospitalizationRepository(db);

		await repository.save(hospitalization);

		const hospitalizations = await repository.getAll();

		assertEquals(hospitalizations.length, 3);
		assertEquals(hospitalizations[0].status, "Aberta");
	});

	await t.step("Deve actualizar a hospitalização.", async () => {
		const db = await init_test_db();

		populate(db);

		const hospitalization = new Hospitalization(
			ID.random(),
			"1918BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
		);

		const repository = new SQLiteHospitalizationRepository(db);

		await repository.save(hospitalization);

		hospitalization.close();

		await repository.update(hospitalization);

		const hospitalizations = await repository.getAll();

		assertEquals(hospitalizations[2].isOpen(), false);
	});

	await t.step("Deve recuperar um hospitalização com base no paciente.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteHospitalizationRepository(db);

		const hospitalization = await repository.getByPatientId(ID.fromString("1918BA"));

		assertEquals(hospitalization.isRight(), true);
	});

	await t.step("Deve retornar um erro caso a hospitalização não for encontrada.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteHospitalizationRepository(db);

		const hospitalization = await repository.getByPatientId(ID.fromString("patient-19200BA"));

		assertEquals(hospitalization.isLeft(), true);
		assertInstanceOf(hospitalization.value, HospitalizationNotFound);
	});
});
