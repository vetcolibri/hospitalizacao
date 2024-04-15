import { SQLitePatientRepository } from "persistence/sqlite/sqlite_patient_repository.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { init_test_db, populate } from "./test_db.ts";
import { patient1, patient2 } from "../fake_data.ts";
import { assertEquals, assertInstanceOf } from "dev_deps";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { ID } from "shared/id.ts";

Deno.test("SQLite - Patient Repository", async (t) => {
	await t.step("Deve verificar se o paciente existe.", async () => {
		const db = await init_test_db();

		populate(db);

		const patientId = ID.fromString("some-patient-id");

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

		const patientOrErr = await repository.getById(patient1.systemId);

		const patient = <Patient> patientOrErr.value;

		assertEquals(patient.systemId.value, patient1.systemId.value);
		assertEquals(patient.patientId.value, "some-patient-id");
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
		assertEquals(patients[0].patientId.value, "some-patient-id");
		assertEquals(patients[0].status, PatientStatus.Hospitalized);
	});

	await t.step("Deve recuperar os pacientes não hospitalizados.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLitePatientRepository(db);

		const patients = await repository.nonHospitalized();

		assertEquals(patients.length, 1);
		assertEquals(patients[0].patientId.value, "some-fake-patient-id");
		assertEquals(patients[0].status, PatientStatus.Discharged);
	});

	await t.step("Deve atualizar os dados de um paciente.", async () => {
		const db = await init_test_db();

		patient2.discharge();

		populate(db);

		const repository = new SQLitePatientRepository(db);

		await repository.update(patient2);

		const patientOrErr = await repository.getById(patient2.systemId);

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
