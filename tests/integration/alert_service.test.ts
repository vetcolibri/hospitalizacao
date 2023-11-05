import { InmemAlertRepository } from "../../adaptors/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "../../adaptors/inmem/inmem_patient_repository.ts";
import { CronType } from "../../adaptors/tasks/background_task_manager.ts";
import { AlertService } from "../../application/alert_service.ts";
import {
	assertEquals,
	assertInstanceOf,
	assertSpyCall,
	assertSpyCalls,
	spy,
} from "../../dev_deps.ts";
import { Alert, AlertStatus } from "../../domain/alerts/alert.ts";
import { ID } from "../../domain/id.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { BackgroundTaskManagerMock } from "../../test_double/mocks/background_task_manager_mock.ts";
import { patient1 } from "../fake_data.ts";

Deno.test("Alert Service - Schedule Alert", async (t) => {
	await t.step("Deve buscar o paciente no repositório", async () => {
		const { service, patientRepository } = await makeService()
		const repoSpy = spy(patientRepository, "getById");

		await service.schedule("1234", alertData);

		assertSpyCall(repoSpy, 0, { args: [ID.New("1234")] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve lançar @PatientNotFound se o paciente não existir", async () => {
		const { service } = await makeService()
		
		const error = await service.schedule("1234", alertData);

		assertEquals(error.isLeft(), true);
		assertInstanceOf(error.value, PatientNotFound);
		assertEquals(error.value.message, "Patient not found");
	});

	await t.step("Deve salvar o alerta no repositório", async () => {
		const { service, alertRepository } = await makeService()
		const repoSpy = spy(alertRepository, "save");

		await service.schedule("some-patient-id", alertData);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve registar os parâmetros do alerta", async () => {
		const { service, alertRepository } = await makeService()

		await service.schedule("some-patient-id", alertData);

		const alerts = await alertRepository.findAll(ID.New("some-patient-id"));

		assertEquals(alerts.length, 2);
		assertEquals(alerts[0].getParameters(), alertData.parameters);
		assertEquals(alerts[0].getStatus(), AlertStatus.ACTIVE);
	});

	await t.step("Deve chamar registerCron para agendar o alerta.", async () => {
		const { service, alertRepository,  patientRepository, taskManager } = await makeService()
		await patientRepository.save(patient1);
		const taskManagerSpy = spy(taskManager, "registerCron");

		await service.schedule("some-patient-id", alertData);

		const alert = await alertRepository.last();

		assertSpyCall(taskManagerSpy, 0, { args: [alert] });
		assertSpyCalls(taskManagerSpy, 1);
	});

	await t.step("Deve publicar o alerta ao worker para ser registrada.", async () => {
		const { service, alertRepository, taskManager } = await makeService()
		const workerSpy = spy(taskManager.worker, "postMessage");

		await service.schedule("some-patient-id", alertData);

		const alert = await alertRepository.last();

		assertSpyCall(workerSpy, 0, { args: [{ alert, type: CronType.PUBLISH }] });
		assertSpyCalls(workerSpy, 1);
	});

	await t.step("Deve receber a frequência de apresentação do alerta.", async () => {
		const { service, alertRepository } = await makeService()

		await service.schedule("some-patient-id", alertData);

		const alert = await alertRepository.last();
		assertEquals(alert.getRate(), alertData.rate);
	});

	await t.step("Deve receber o comentário do medVet para o alerta", async () => {
		const { service, alertRepository} = await makeService()

		await service.schedule("some-patient-id", alertData);

		const alert = await alertRepository.last();
		assertEquals(alert.comments, alertData.comments);
	});

	await t.step("Deve receber a hora de exibição do alerta", async () => {
		const { service, alertRepository,  patientRepository } = await makeService()
		await patientRepository.save(patient1);

		await service.schedule("some-patient-id", alertData);

		const alert = await alertRepository.last();
		assertEquals(alert.getTime(), alertData.time);
	});
});

Deno.test("Alert Service - Cancel Alert", async (t) => {
	await t.step("Deve recuperar o alerta activo no repositório com base no ID.", async () => {
		const { service, alertRepository } = await makeService()
		const alert = await alertRepository.last();
		const repoSpy = spy(alertRepository, "getById");

		await service.cancel(alert.alertId.toString());

		assertSpyCall(repoSpy, 0, { args: [alert.alertId] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve alterar o estado do alerta para **disabled**.", async () => {
		const { service, alertRepository } = await makeService()
		const alert = await alertRepository.last();
	
		await service.cancel(alert.alertId.toString());

		assertEquals(alert.getStatus(), AlertStatus.DISABLED);
	});

	await t.step("Deve actualizar o alerta no repositório.", async () => {
		const { service, alertRepository } = await makeService()
		const alert = await alertRepository.last();
		const repoSpy = spy(alertRepository, "update");

		await service.cancel(alert.alertId.toString());

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve chamar o método removeCron para remover o alerta.", async () => {
		const { service, alertRepository, taskManager } = await makeService()
		const alert = await alertRepository.last();
		const taskManagerSpy = spy(taskManager, "removeCron");

		await service.cancel(alert.alertId.toString());

		assertSpyCall(taskManagerSpy, 0);
		assertSpyCalls(taskManagerSpy, 1);
	});

	await t.step("Deve publicar o alerta ao worker para ser removido.", async () => {
		const { service, alertRepository, taskManager } = await makeService()
		const alert = await alertRepository.last();
		
		const workerSpy = spy(taskManager.worker, "postMessage");

		await service.cancel(alert.alertId.toString());

		assertSpyCall(workerSpy, 0, { args: [{ alert: alert, type: CronType.REMOVE }] });
		assertSpyCalls(workerSpy, 1);
	});

	await t.step("Deve retornar @AlertNotFound se o alerta não existir.", async () => {
		const { service } = await makeService()

		const error = await service.cancel("dummy");

		assertEquals(error.isLeft(), true);
	});

	await t.step(
		"Deve retornar @AlertAlreadyDisabled se o alerta já estiver desactivado.",
		async () => {
			const { service, alertRepository } = await makeService()
			const alert = await alertRepository.last();
			alert.cancel();
			
			const error = await service.cancel(alert.alertId.toString());

			assertEquals(error.isLeft(), true);
		},
	);
});

const alertData = {
	parameters: ["heartRate", "bloodPressure", "glicemia"],
	rate: 120,
	time: new Date().toISOString(),
	comments: "Some comment.",
}

async function makeService() {
	const alert = Alert.create(
		patient1, 
		alertData.parameters, 
		alertData.rate, 
		alertData.comments, 
		alertData.time
	);
	const alertRepository = new InmemAlertRepository();
	await alertRepository.save(alert);
	const patientRepository = new InmemPatientRepository();
	await patientRepository.save(patient1)
	const taskManager = new BackgroundTaskManagerMock();
	const deps = {
		alertRepository: alertRepository,
		patientRepository: patientRepository,
		taskManager: taskManager,
	}
	const service = new AlertService(deps);
	return {alertRepository, patientRepository, taskManager, service };
}