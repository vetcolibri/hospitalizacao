import { SQLiteAlertRepository } from "../../adaptors/persistence/sqlite_alert_repository.ts";
import { Alert, AlertStatus } from "../../domain/alerts/alert.ts";
import { alert1, patient1 } from "../fake_data.ts";
import { assertEquals } from "../../dev_deps.ts";
import { init_test_db } from "./test_db.ts";
import { ID } from "../../domain/id.ts";
import { DB } from "../../deps.ts";


Deno.test("SQLite - Alert Repository", async (t) => {
	await t.step("Deve recuperar os alertas de um paciente", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db)
		const patientId = ID.New("some-patient-id");

		const alerts = await repository.findAll(patientId);

		assertEquals(alerts.length, 1);
		assertEquals(alerts[0].patient.patientId, patientId);
		assertEquals(alerts[0].parameters.length, 3);
	});

	await t.step("Deve retornar um array vazio se não existir alertas", async () => {
		const db = await init_test_db();
		populate(db);
		const patientId = ID.New("some-id");
		const repository = new SQLiteAlertRepository(db)

		const alerts = await repository.findAll(patientId);

		assertEquals(alerts.length, 0);
	});

	await t.step("Deve verificar se um paciente possui alertas", async () => {
		const db = await init_test_db();
		populate(db);
		const patientId = ID.New("some-patient-id");
		const repository = new SQLiteAlertRepository(db)

		const hasAlerts = await repository.verify(patientId);

		assertEquals(hasAlerts, true);
	});

	await t.step("Deve retornar false se o paciente não possuir alertas", async () => {
		const db = await init_test_db();
		populate(db);
		const patientId = ID.New("some-id");
		const repository = new SQLiteAlertRepository(db)

		const hasAlerts = await repository.verify(patientId);

		assertEquals(hasAlerts, false);
	});

	await t.step("Deve recuperar o alerta pelo seu ID", async () => {
		const db = await init_test_db();
		populate(db);
		const alert = <Alert>alert1.value;
		const repository = new SQLiteAlertRepository(db)

		const alertOrError = await repository.getById(alert.alertId)

		assertEquals(alertOrError.isRight(), true);
	});

	await t.step("Deve retornar um erro se o alerta não existir", async () => {
		const db = await init_test_db();
		populate(db);
		const alertId = ID.New("fake-alert-id");
		const repository = new SQLiteAlertRepository(db)

		const alertOrError = await repository.getById(alertId)

		assertEquals(alertOrError.isLeft(), true);
	});

	await t.step("Deve atualizar o estado do alerta", async () => {
		const db = await init_test_db();
		populate(db);
		const fakeAlert = <Alert>alert1.value;
		const repository = new SQLiteAlertRepository(db)

		await repository.update(fakeAlert);

		const alertOrError = await repository.getById(fakeAlert.alertId);
		const alert = <Alert>alertOrError.value;

		assertEquals(alertOrError.isRight(), true);
		assertEquals(alert.status, AlertStatus.DISABLED);
	});

	await t.step("Deve recuperar o ultimo alerta", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db)

		const alert = await repository.last();

		assertEquals(alert.status, AlertStatus.ACTIVE);
	});

	await t.step("Deve salvar o alerta", async () => {
		const time = new Date().toISOString();
		const alertData = {
			parameters: ["some-param"], 
			rate: 1000, 
			comments: "some-comment", 
			time
		}
		const db = await init_test_db();
		populate(db);
		const newAlertOrError = Alert.create(patient1, alertData)
		const alert = <Alert>newAlertOrError.value;
		const repository = new SQLiteAlertRepository(db)

		await repository.save(alert);

		const alertOrError = await repository.getById(alert.alertId);
		
		const alertRecovered = <Alert>alertOrError.value

		assertEquals(alertRecovered.status, alert.status)		
	});

});


function populate(db: DB) {
	const alert = alert1.value as Alert;

	const insert_owner = `INSERT INTO owners (
			owner_id,
			owner_name,
			phone_number
		)
		VALUES (
			'${patient1.owner.ownerId.getValue()}',
			'${patient1.owner.name}',
			'${patient1.owner.phoneNumber}'
		)`;

	const insert_patient = `INSERT INTO patients (
			patient_id,
			name,
			specie,
			breed,
			status,
			birth_date,
			owner_id
		) 
		VALUES (
			'${patient1.patientId.getValue()}',
			'${patient1.name}',
			'${patient1.specie}',
			'${patient1.breed}',
			'${patient1.status}',
			'${patient1.birthDate.value.toISOString()}',
			'${patient1.owner.ownerId.getValue()}'
		)
	`;

	const insert_alert = `INSERT INTO alerts (
			alert_id,
			patient_id,
			parameters,
			repeat_every,
			time,
			comments,
			status
		)  VALUES (
			'${alert.alertId.getValue()}',
			'${alert.patient.patientId.getValue()}',
			'${JSON.stringify(alert.parameters.join(","))}',
			'${alert.repeatEvery.getValue()}',
			'${alert.time.toISOString()}',
			'${alert.comments}',
			'${alert.status}'
		)
	`;

	db.execute(insert_owner);

	db.execute(insert_patient);

	db.execute(insert_alert);
}
