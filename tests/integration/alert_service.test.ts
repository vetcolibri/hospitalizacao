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
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const repoSpy = spy(patientRepository, "getById");
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("1234", parameters, rateInSeconds, comments, time);

		assertSpyCall(repoSpy, 0, { args: [ID.New("1234")] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve lançar @PatientNotFound se o paciente não existir", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		const error = await service.schedule("1234", parameters, rateInSeconds, comments, time);

		assertEquals(error.isLeft(), true);
		assertInstanceOf(error.value, PatientNotFound);
		assertEquals(error.value.message, "Patient not found");
	});

	await t.step("Deve salvar o alerta no repositório", async () => {
		const patientRepository = new InmemPatientRepository();
		patientRepository.save(patient1);
		const alertRepository = new InmemAlertRepository();
		const repoSpy = spy(alertRepository, "save");
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("some-patient-id", parameters, rateInSeconds, comments, time);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve registar os parâmetros do alerta", async () => {
		const parameters = [
			"heartRate",
			"bloodPressure",
			"glicemia",
		];
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient1);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("some-patient-id", parameters, rateInSeconds, comments, time);

		const alerts = await alertRepository.findAll(ID.New("some-patient-id"));
		assertEquals(alerts.length, 1);
		assertEquals(alerts[0].getParameters(), parameters);
		assertEquals(alerts[0].getStatus(), AlertStatus.ACTIVE);
	});

	await t.step("Deve chamar registerCron para agendar o alerta.", async () => {
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient1);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);
		const taskManagerSpy = spy(taskManager, "registerCron");

		await service.schedule("some-patient-id", parameters, rateInSeconds, comments, time);

		const alert = await alertRepository.last();

		assertSpyCall(taskManagerSpy, 0, { args: [alert] });
		assertSpyCalls(taskManagerSpy, 1);
	});

	await t.step("Deve publicar o alerta ao worker para ser registrada.", async () => {
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient1);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);
		const workerSpy = spy(taskManager.worker, "postMessage");

		await service.schedule("some-patient-id", parameters, rateInSeconds, comments, time);

		const alert = await alertRepository.last();

		assertSpyCall(workerSpy, 0, { args: [{ alert, type: CronType.PUBLISH }] });
		assertSpyCalls(workerSpy, 1);
	});

	await t.step("Deve receber a frequência de apresentação do alerta.", async () => {
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient1);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("some-patient-id", parameters, rateInSeconds, comments, time);

		const alert = await alertRepository.last();
		assertEquals(alert.getRate(), rateInSeconds);
	});

	await t.step("Deve receber o comentário do medVet para o alerta", async () => {
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient1);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("some-patient-id", parameters, rateInSeconds, comments, time);

		const alert = await alertRepository.last();
		assertEquals(alert.comments, comments);
	});

	await t.step("Deve receber a hora de exibição do alerta", async () => {
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient1);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("some-patient-id", parameters, rateInSeconds, comments, time);

		const alert = await alertRepository.last();
		assertEquals(alert.getTime(), time);
	});
});

Deno.test("Alert Service - Cancel Alert", async (t) => {
	await t.step("Deve recuperar o alerta activo no repositório com base no ID.", async () => {
		const alert = Alert.create(patient1, parameters, rateInSeconds, comments, time);
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		await alertRepository.save(alert);
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(
			alertRepository,
			patientRepository,
			taskManager,
		);
		const repoSpy = spy(alertRepository, "getById");

		await service.cancel(alert.alertId.toString());

		assertSpyCall(repoSpy, 0, { args: [alert.alertId] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve alterar o estado do alerta para **disabled**.", async () => {
		const alert = Alert.create(patient1, parameters, rateInSeconds, comments, time);
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		await alertRepository.save(alert);
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(
			alertRepository,
			patientRepository,
			taskManager,
		);

		await service.cancel(alert.alertId.toString());

		const lastAlert = await alertRepository.last();

		assertEquals(lastAlert.getStatus(), AlertStatus.DISABLED);
	});

	await t.step("Deve actualizar o alerta no repositório.", async () => {
		const alert = Alert.create(patient1, parameters, rateInSeconds, comments, time);
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		await alertRepository.save(alert);
		const repoSpy = spy(alertRepository, "update");
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(
			alertRepository,
			patientRepository,
			taskManager,
		);

		await service.cancel(alert.alertId.toString());

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve chamar o método removeCron para remover o alerta.", async () => {
		const alert = Alert.create(patient1, parameters, rateInSeconds, comments, time);
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		await alertRepository.save(alert);
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(
			alertRepository,
			patientRepository,
			taskManager,
		);
		const taskManagerSpy = spy(taskManager, "removeCron");

		await service.cancel(alert.alertId.toString());

		assertSpyCall(taskManagerSpy, 0);
		assertSpyCalls(taskManagerSpy, 1);
	});

	await t.step("Deve publicar o alerta ao worker para ser removido.", async () => {
		const alert = Alert.create(patient1, parameters, rateInSeconds, comments, time);
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		await alertRepository.save(alert);
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(
			alertRepository,
			patientRepository,
			taskManager,
		);
		const workerSpy = spy(taskManager.worker, "postMessage");

		await service.cancel(alert.alertId.toString());

		assertSpyCall(workerSpy, 0, { args: [{ alert: alert, type: CronType.REMOVE }] });
		assertSpyCalls(workerSpy, 1);
	});
	await t.step("Deve retornar @AlertNotFound se o alerta não existir.", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(
			alertRepository,
			patientRepository,
			taskManager,
		);

		const error = await service.cancel("dummy");

		assertEquals(error.isLeft(), true);
	});

	await t.step(
		"Deve retornar @AlertAlreadyDisabled se o alerta já estiver desactivado.",
		async () => {
			const alert = Alert.create(patient1, parameters, rateInSeconds, comments, time);
			alert.cancel();
			const patientRepository = new InmemPatientRepository();
			const alertRepository = new InmemAlertRepository();
			await alertRepository.save(alert);
			const taskManager = new BackgroundTaskManagerMock();
			const service = new AlertService(
				alertRepository,
				patientRepository,
				taskManager,
			);

			const error = await service.cancel(alert.alertId.toString());

			assertEquals(error.isLeft(), true);
		},
	);
});

const parameters = [
	"heartRate",
	"bloodPressure",
	"glicemia",
];
const rateInSeconds = 120;
const time = new Date().toLocaleDateString();
const comments = "Some comment.";
