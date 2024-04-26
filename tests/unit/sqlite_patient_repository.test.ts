import { SQLitePatientRepository } from "persistence/sqlite/sqlite_patient_repository.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { init_test_db, populate } from "./test_db.ts";
import { assert, assertEquals, assertInstanceOf } from "dev_deps";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { ID } from "shared/id.ts";
import { PATIENTS } from "../fake_data.ts";

Deno.test("SQLite - Patient Repository", async (t) => {
	await t.step("Deve verificar se o paciente existe.", async () => {
		const db = await init_test_db();

		populate(db);

		const patientId = ID.fromString("some-id");

		const repository = new SQLitePatientRepository(db);

		const exists = await repository.exists(patientId);

		assertEquals(exists, true);
	});

	await t.step("Deve retornar false se o paciente não existir.", async () => {
		const db = await init_test_db();
		populate(db);

		const patientId = ID.fromString("1918HTG");

		const repository = new SQLitePatientRepository(db);

		const exists = await repository.exists(patientId);

		assertEquals(exists, false);
	});

	await t.step("Deve recuperar o paciente pelo seu ID", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLitePatientRepository(db);

		const patientOrErr = await repository.getById(PATIENTS.hospitalized["1918BA"].systemId);

		const patient = <Patient> patientOrErr.value;

		assertEquals(patient.systemId.value, PATIENTS.hospitalized["1918BA"].systemId.value);
		assertEquals(patient.patientId.value, PATIENTS.hospitalized["1918BA"].patientId.value);
	});

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não existir",
		async () => {
			const db = await init_test_db();

			populate(db);

			const repository = new SQLitePatientRepository(db);

			const patientOrErr = await repository.getById(ID.fromString("1991BC"));

			assertEquals(patientOrErr.isLeft(), true);
			assertInstanceOf(patientOrErr.value, PatientNotFound);
		},
	);

	await t.step("Deve recuperar os pacientes hospitalizados.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLitePatientRepository(db);

		const patients = await repository.hospitalized();

		assertEquals(patients.length, 2);
		assertEquals(patients[0].status, PatientStatus.Hospitalized);
		assertEquals(patients[1].status, PatientStatus.Hospitalized);
	});

	await t.step("Deve recuperar os pacientes não hospitalizados.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLitePatientRepository(db);

		const patients = await repository.nonHospitalized();

		assert(patients.length >= 1);
		assertEquals(patients.every((p) => p.status === PatientStatus.Discharged), true);
	});

	await t.step("Deve atualizar os dados de um paciente.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLitePatientRepository(db);

		await repository.save(PATIENTS.hospitalized["1920BA"]);

		PATIENTS.hospitalized["1920BA"].discharge();

		await repository.update(PATIENTS.hospitalized["1920BA"]);

		const patientOrErr = await repository.getById(PATIENTS.hospitalized["1920BA"].systemId);

		const patient = <Patient> patientOrErr.value;

		assertEquals(patient.status, PatientStatus.Discharged);
	});

	await t.step("Deve salvar um paciente.", async () => {
		const db = await init_test_db();

		populate(db);

		const systemId = ID.random();

		const newPatient = new Patient(
			systemId,
			"1900HG",
			"França",
			"Canino",
			"Buldog",
			"2018-07-01",
			"1001",
		);

		const repository = new SQLitePatientRepository(db);

		await repository.save(newPatient);

		const patientOrErr = await repository.getById(systemId);

		const patient = <Patient> patientOrErr.value;

		assertEquals(patient.systemId.value, systemId.value);
		assertEquals(patient.patientId.value, newPatient.patientId.value);
		assertEquals(patient.name, newPatient.name);
		assertEquals(patient.status, PatientStatus.Hospitalized);
	});
});
