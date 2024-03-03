import { SQLiteAlertRepository } from "persistence/sqlite/sqlite_alert_repository.ts";
import { Alert, AlertStatus } from "domain/alerts/alert.ts";
import { alert1, patient1 } from "../fake_data.ts";
import { assertEquals } from "dev_deps";
import { init_test_db, populate } from "./test_db.ts";
import { ID } from "shared/id.ts";

Deno.test("SQLite - Alert Repository", async (t) => {
	await t.step("Deve recuperar os alertas de um paciente", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db);

		const alerts = await repository.findAll(patient1.systemId);

		assertEquals(alerts.length, 1);
		assertEquals(alerts[0].parameters.length, 3);
	});

	await t.step("Deve retornar um array vazio se não existir alertas", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db);

		const alerts = await repository.findAll(ID.fromString("some-id"));

		assertEquals(alerts.length, 0);
	});

	await t.step("Deve verificar se um paciente possui alertas", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db);

		const hasAlerts = await repository.verify(patient1.systemId);

		assertEquals(hasAlerts, true);
	});

	await t.step("Deve retornar false se o paciente não possuir alertas", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db);

		const hasAlerts = await repository.verify(ID.fromString("some-id"));

		assertEquals(hasAlerts, false);
	});

	await t.step("Deve recuperar o alerta pelo seu ID", async () => {
		const db = await init_test_db();
		populate(db);
		const alert = <Alert> alert1.value;
		const repository = new SQLiteAlertRepository(db);

		const alertOrError = await repository.getById(alert.alertId);

		assertEquals(alertOrError.isRight(), true);
	});

	await t.step("Deve retornar um erro se o alerta não existir", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db);

		const alertOrError = await repository.getById(ID.fromString("fake-alert-id"));

		assertEquals(alertOrError.isLeft(), true);
	});

	await t.step("Deve atualizar o estado do alerta", async () => {
		const db = await init_test_db();
		populate(db);
		const fakeAlert = <Alert> alert1.value;
		const repository = new SQLiteAlertRepository(db);

		await repository.update(fakeAlert);

		const alertOrError = await repository.getById(fakeAlert.alertId);

		const alert = <Alert> alertOrError.value;

		assertEquals(alertOrError.isRight(), true);
		assertEquals(alert.status, AlertStatus.DISABLED);
	});

	await t.step("Deve recuperar o ultimo alerta", async () => {
		const db = await init_test_db();
		populate(db);
		const repository = new SQLiteAlertRepository(db);

		const alert = await repository.last();

		assertEquals(alert.status, AlertStatus.ENABLED);
	});

	await t.step("Deve salvar o alerta", async () => {
		const time = new Date().toISOString();
		const alertData = {
			parameters: ["some-param"],
			rate: 1000,
			comments: "some-comment",
			time,
		};
		const db = await init_test_db();
		populate(db);
		const newAlertOrError = Alert.create(patient1, alertData);
		const alert = <Alert> newAlertOrError.value;
		const repository = new SQLiteAlertRepository(db);

		await repository.save(alert);

		const alertOrError = await repository.getById(alert.alertId);

		const alertRecovered = <Alert> alertOrError.value;

		assertEquals(alertRecovered.status, alert.status);
	});
});
