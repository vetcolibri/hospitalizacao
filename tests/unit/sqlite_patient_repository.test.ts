import { SQLitePatientRepository } from "persistence/sqlite/sqlite_patient_repository.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { init_test_db, populate } from "./test_db.ts";
import { patient1, patient2 } from "../fake_data.ts";
import { assertEquals } from "dev_deps";
import { ID } from "shared/id.ts";
import { Owner } from "domain/patients/owner.ts";

Deno.test("SQLite - Patient Repository", async (t) => {
  await t.step("Deve verificar se o paciente existe.", async () => {
    const db = await init_test_db();
    populate(db);
    const patientId = ID.New("some-patient-id");
    const repository = new SQLitePatientRepository(db);

    const exists = await repository.exists(patientId);

    assertEquals(exists, true);
  });

  await t.step("Deve retornar false se o paciente não existir.", async () => {
    const db = await init_test_db();
    populate(db);
    const patientId = ID.New("some-fake-id");
    const repository = new SQLitePatientRepository(db);

    const exists = await repository.exists(patientId);

    assertEquals(exists, false);
  });

  await t.step("Deve atualizar os dados de um paciente.", async () => {
    const db = await init_test_db();
    populate(db);
    const repository = new SQLitePatientRepository(db);

    await repository.update(patient2);

    const patientOrError = await repository.getById(ID.New("some-id"));
    const patient = <Patient>patientOrError.value;
    const hospitalization = patient.openHospitalization();

    assertEquals(patientOrError.isRight(), true);
    assertEquals(hospitalization?.isOpen(), true);
    assertEquals(hospitalization?.weight, 16.5);
  });

  await t.step("Deve recuperar o paciente pelo seu ID", async () => {
    const db = await init_test_db();
    populate(db);
    const repository = new SQLitePatientRepository(db);

    const patientOrError = await repository.getById(ID.New("some-patient-id"));

    const patient = <Patient>patientOrError.value;
    const hospitalization = patient.openHospitalization();

    assertEquals(patientOrError.isRight(), true);
    assertEquals(patient.patientId.value, "some-patient-id");
    assertEquals(patient.status, PatientStatus.HOSPITALIZED);
    assertEquals(hospitalization?.isOpen(), true);
    assertEquals(hospitalization?.weight, 16.5);
  });

  await t.step(
    "Deve retornar @PatientNotFound se o paciente não existir",
    async () => {
      const db = await init_test_db();
      populate(db);
      const repository = new SQLitePatientRepository(db);

      const patientOrError = await repository.getById(ID.New("some-fake-id"));

      assertEquals(patientOrError.isLeft(), true);
    }
  );

  await t.step("Deve retornar todos os pacientes hospitalizados.", async () => {
    const db = await init_test_db();
    populate(db);
    const repository = new SQLitePatientRepository(db);

    const patients = await repository.hospitalized();

    assertEquals(patients.length, 1);
    assertEquals(patients[0].patientId.value, "some-patient-id");
    assertEquals(patients[0].status, PatientStatus.HOSPITALIZED);
    assertEquals(patients[0].hospitalizations.length, 2);
  });

  await t.step("Deve retornar todos os pacientes com alta.", async () => {
    const db = await init_test_db();
    populate(db);
    const repository = new SQLitePatientRepository(db);

    const patients = await repository.nonHospitalized();

    assertEquals(patients.length, 1);
    assertEquals(patients[0].patientId.value, "some-fake-patient-id");
    assertEquals(patients[0].status, PatientStatus.DISCHARGED);
    assertEquals(patients[0].hospitalizations.length, 1);
  });

  await t.step("Deve salvar um paciente.", async () => {
    const db = await init_test_db();
    const repository = new SQLitePatientRepository(db);

    await repository.save(patient1);

    const patientOrError = await repository.getById(ID.New("some-patient-id"));
    const patient = <Patient>patientOrError.value;
    const hospitalization = patient.openHospitalization();

    assertEquals(patientOrError.isRight(), true);
    assertEquals(patient.patientId.value, "some-patient-id");
    assertEquals(patient.status, PatientStatus.HOSPITALIZED);
    assertEquals(hospitalization?.isOpen(), true);
    assertEquals(hospitalization?.weight, 16.5);
  });

  await t.step("Deve recuperar o Dono do paciente.", async () => {
    const db = await init_test_db();
    populate(db);
    const repository = new SQLitePatientRepository(db);

    const ownerOrError = await repository.findOwner(ID.New("1001"));
    const owner = <Owner>ownerOrError.value;

    assertEquals(ownerOrError.isRight(), true);
    assertEquals(owner.ownerId.value, "1001");
  });

  await t.step(
    "Deve retornar @OwnerNotFound se o dono não existir.",
    async () => {
      const db = await init_test_db();
      populate(db);
      const repository = new SQLitePatientRepository(db);

      const ownerOrError = await repository.findOwner(ID.New("some-fake-id"));

      assertEquals(ownerOrError.isLeft(), true);
    }
  );
});
