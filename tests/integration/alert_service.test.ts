import { AlertService } from "application/alert_service.ts";
import { assertEquals, assertInstanceOf, assertSpyCall, assertSpyCalls, spy } from "dev_deps";
import { Alert, AlertStatus } from "domain/hospitalization/alerts/alert.ts";
import { AlertAlreadyDisabled } from "domain/hospitalization/alerts/alert_already_disabled_error.ts";
import { RepeatEvery } from "domain/hospitalization/alerts/repeat_every.ts";
import { InvalidRepeatEvery } from "domain/hospitalization/alerts/repeat_every_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";

Deno.test("Alert Service - Schedule Alert", async (t) => {
	await t.step(
		"Deve retornar @PatientNotFound se o paciente não existir",
		async () => {
			const { service } = await makeService();

			const error = await service.schedule({ ...alertData, patientId: "1234" });

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);

	await t.step("Deve salvar o alerta no repositório", async () => {
		const { service, alertRepository } = await makeService();

		await service.schedule(alertData);

		const alerts = await alertRepository.findAll(ID.fromString("1918BA"));

		assertEquals(alerts.length, 2);
		assertEquals(alerts[0].patientId.value, "1918BA");
		assertEquals(alerts[0].status, AlertStatus.Enabled);
	});

	await t.step("Deve registar os parâmetros do alerta", async () => {
		const { service, alertRepository } = await makeService();

		await service.schedule(alertData);

		const alerts = await alertRepository.findAll(ID.fromString("1918BA"));

		assertEquals(alerts.length, 2);
		assertEquals(alerts[1].parameters, alertData.parameters);
	});

	await t.step("Deve agendar o alerta.", async () => {
		const { service, notifier } = await makeService();

		const notifierSpy = spy(notifier, "schedule");

		await service.schedule(alertData);

		assertSpyCalls(notifierSpy, 1);
	});

	await t.step(
		"Deve receber a frequência de apresentação do alerta.",
		async () => {
			const { service, alertRepository } = await makeService();

			await service.schedule(alertData);

			const alert = await alertRepository.last();

			assertEquals(alert.repeatEvery, alertData.rate);
		},
	);

	await t.step(
		"Deve receber o comentário do medVet para o alerta",
		async () => {
			const { service, alertRepository } = await makeService();

			await service.schedule(alertData);

			const alert = await alertRepository.last();
			assertEquals(alert.comments, alertData.comments);
		},
	);

	await t.step("Deve receber a hora de exibição do alerta", async () => {
		const { service, alertRepository } = await makeService();

		await service.schedule(alertData);

		const alert = await alertRepository.last();

		assertEquals(alert.time, alertData.time);
	});

	await t.step(
		"Deve retornar @InvalidRate se o frequencia for menor que 1 segundo.",
		async () => {
			const { service } = await makeService();

			const error = await service.schedule({
				...alertData,
				rate: 0,
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidRepeatEvery);
		},
	);
});

Deno.test("Alert Service - Cancel Alert", async (t) => {
	await t.step("Deve cancelar o alerta", async () => {
		const { service, alertRepository } = await makeService();

		const alert = await alertRepository.last();

		await service.cancel(alert.alertId.value);

		assertEquals(alert.status, AlertStatus.Disabled);
	});

	await t.step("Deve actualizar o alerta no repositório.", async () => {
		const { service, alertRepository } = await makeService();
		const alert = await alertRepository.last();
		const repoSpy = spy(alertRepository, "update");

		await service.cancel(alert.alertId.value);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step(
		"Deve chamar o método removeCron para remover o alerta.",
		async () => {
			const { service, alertRepository, notifier } = await makeService();
			const alert = await alertRepository.last();
			const notifierSpy = spy(notifier, "cancel");

			await service.cancel(alert.alertId.value);

			assertSpyCall(notifierSpy, 0);
			assertSpyCalls(notifierSpy, 1);
		},
	);

	await t.step(
		"Deve retornar @AlertNotFound se o alerta não existir.",
		async () => {
			const { service } = await makeService();

			const error = await service.cancel("dummy");

			assertEquals(error.isLeft(), true);
		},
	);

	await t.step(
		"Deve retornar @AlertAlreadyDisabled se o alerta já estiver desactivado.",
		async () => {
			const { service, alertRepository } = await makeService();
			const alert = await alertRepository.last();
			alert.cancel();

			const error = await service.cancel(alert.alertId.value);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, AlertAlreadyDisabled);
		},
	);
});

Deno.test("Alert Service - List all active alerts", async (t) => {
	await t.step("Deve recuperar os alertas activos", async () => {
		const { service } = await makeService();

		const alerts = await service.getActiveAlerts();

		assertEquals(alerts.length, 1);
	});

	await t.step("Deve retornar uma lista vazia se não houver alertas", async () => {
		const { service, alertRepository } = await makeService();
		const alert = await alertRepository.last();
		alert.cancel();

		const alerts = await service.getActiveAlerts();

		assertEquals(alerts.length, 0);
		assertEquals(alerts, []);
	});
});

const alertData = {
	patientId: "1918BA",
	parameters: ["heartRate", "bloodPressure", "glicemia"],
	rate: 120,
	time: new Date().toISOString(),
	comments: "Some comment.",
};

async function makeService() {
	const alert = new Alert(
		ID.random(),
		ID.fromString("1918BA"),
		alertData.parameters,
		new Date(alertData.time),
		new RepeatEvery(120),
		alertData.comments,
	);
	const alertRepository = new InmemAlertRepository();
	await alertRepository.save(alert);

	const patientRepository = new PatientRepositoryStub();

	const notifier = new AlertNotifierDummy();

	const service = new AlertService(
		alertRepository,
		patientRepository,
		notifier,
	);
	return { alertRepository, patientRepository, notifier, service };
}
