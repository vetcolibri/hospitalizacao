import { assertEquals } from "dev_deps";
import { Alert, AlertStatus } from "domain/hospitalization/alerts/alert.ts";
import { RepeatEvery } from "domain/hospitalization/alerts/repeat_every.ts";
import { SQLiteAlertRepository } from "persistence/sqlite/sqlite_alert_repository.ts";
import { ID } from "shared/id.ts";
import { alert1, PATIENTS } from "../fake_data.ts";
import { init_test_db, populate } from "./test_db.ts";

Deno.test("SQLite - Alert Repository", async (t) => {
	await t.step("Deve recuperar os alertas de um paciente", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		const alerts = await repository.findAll(PATIENTS.hospitalized["1918BA"].systemId);

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

		const hasAlerts = await repository.verify(PATIENTS.hospitalized["1918BA"].systemId);

		assertEquals(hasAlerts, true);
	});

	await t.step("Deve retornar false se o paciente não possuir alertas", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		const hasAlerts = await repository.verify(ID.fromString("some-id"));

		assertEquals(hasAlerts, false);
	});

	await t.step("Deve recuperar o alerta activo pelo seu ID", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		const alertOrErr = await repository.active(alert1.alertId);
		const alert = <Alert> alertOrErr.value;

		assertEquals(alertOrErr.isRight(), true);
		assertEquals(alert.status, AlertStatus.Enabled);
		assertEquals(alert.alertId.value, alert1.alertId.value);
	});

	await t.step("Deve retornar um erro se o alerta activo não existir", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		const alertOrErr = await repository.active(ID.fromString("fake-alert-id"));

		assertEquals(alertOrErr.isLeft(), true);
	});

	await t.step("Deve atualizar o estado do alerta", async () => {
		const db = await init_test_db();
		populate(db);

		const repository = new SQLiteAlertRepository(db);

		await repository.update(alert1);

		const isDisabled = await repository.verify(alert1.alertId);

		assertEquals(isDisabled, false);
	});

	await t.step("Deve recuperar o ultimo alerta", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		const alert = await repository.last();

		assertEquals(alert.status, AlertStatus.Enabled);
	});

	await t.step("Deve salvar o alerta", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		await repository.save(firstAlert);

		const recordedAlert = await repository.last();

		assertEquals(recordedAlert.alertId.value, "1002");
		assertEquals(recordedAlert.status, firstAlert.status);
	});

	await t.step("Deve recuperar todos os alertas activos", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		await repository.save(secondAlert);

		const alerts = await repository.getActives();

		assertEquals(alerts.every((a) => !a.isDisabled()), true);
	});

	await t.step("Deve recuperar os alertas activos de um paciente", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);

		await repository.save(secondAlert);

		const alerts = await repository.findActives(secondAlert.patientId);

		assertEquals(alerts.every((a) => !a.isDisabled()), true);
	});

	await t.step("Deve atualizar todos os alertas", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteAlertRepository(db);
		await repository.save(firstAlert);
		await repository.save(secondAlert);
		const alerts = await repository.getActives();
		alerts.forEach((a) => a.cancel());

		await repository.updateAll(alerts);

		const disabledAlerts = await repository.getActives();

		assertEquals(disabledAlerts.every((a) => a.isDisabled()), true);
	});
});

const alertData = {
	patientId: PATIENTS.hospitalized["1918BA"].systemId,
	parameters: ["some-param"],
	rate: 1000,
	comments: "some-comment",
	time: new Date().toISOString(),
};

const firstAlert = new Alert(
	ID.fromString("1002"),
	alertData.patientId,
	alertData.parameters,
	new Date(alertData.time),
	new RepeatEvery(alertData.rate),
	alertData.comments,
);

const secondAlert = new Alert(
	ID.fromString("1003"),
	alertData.patientId,
	alertData.parameters,
	new Date(alertData.time),
	new RepeatEvery(alertData.rate),
	alertData.comments,
);
