import { InmemAlertRepository } from "../../adaptors/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "../../adaptors/inmem/inmem_patient_repository.ts";
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
import { Patient } from "../../domain/patients/patient.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { BackgroundTaskManagerMock } from "../../test_double/mocks/background_task_manager_mock.ts";

Deno.test("Alert Service - Schedule Alert", async (t) => {
	await t.step("Deve buscar o paciente no repositório", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const repoSpy = spy(patientRepository, "getById");
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("1234", parameters);

		assertSpyCall(repoSpy, 0, { args: [ID.New("1234")] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve lançar @PatientNotFound se o paciente não existir", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		const error = await service.schedule("1234", parameters);

		assertEquals(error.isLeft(), true);
		assertInstanceOf(error.value, PatientNotFound);
		assertEquals(error.value.message, "Patient not found");
	});

	await t.step("Deve salvar o alerta no repositório", async () => {
		const patientRepository = new InmemPatientRepository();
		patientRepository.save(patient);
		const alertRepository = new InmemAlertRepository();
		const repoSpy = spy(alertRepository, "save");
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("1234", parameters);

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
		await patientRepository.save(patient);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);

		await service.schedule("1234", parameters);

		const alerts = await alertRepository.findAll(ID.New("1234"));
		assertEquals(alerts.length, 1);
		assertEquals(alerts[0].getParameters(), parameters);
		assertEquals(alerts[0].getStatus(), AlertStatus.ENABLE);
	});

	await t.step("Deve chamar registerCron para agendar o alerta.", async () => {
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);
		const taskManagerSpy = spy(taskManager, "registerCron");

		await service.schedule("1234", parameters);

		const alert = await alertRepository.last();

		assertSpyCall(taskManagerSpy, 0, { args: [alert] });
		assertSpyCalls(taskManagerSpy, 1);
	});

	await t.step("Deve publicar o alerta ao worker para ser registrada.", async () => {
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient);
		const alertRepository = new InmemAlertRepository();
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(alertRepository, patientRepository, taskManager);
		const workerSpy = spy(taskManager.worker, "postMessage");

		await service.schedule("1234", parameters);

		assertSpyCall(workerSpy, 0);
		assertSpyCalls(workerSpy, 1);
	});
});

Deno.test("Alert Service - Disabled Alert", async (t) => {
	await t.step("Deve recuperar o alerta no repositório com base no ID.", async () => {
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

		await service.cancel(alertId);

		assertSpyCall(repoSpy, 0, { args: [ID.New(alertId)] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve alterar o estado do alerta para **disabled**.", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		await alertRepository.save(alert);
		const taskManager = new BackgroundTaskManagerMock();
		const service = new AlertService(
			alertRepository,
			patientRepository,
			taskManager,
		);

		await service.cancel(alertId);

		const disabledAlert = await alertRepository.getById(ID.New(alertId));
		assertEquals(disabledAlert.getStatus(), AlertStatus.DISABLE);
	});

	await t.step("Deve actualizar o alerta no repositório.", async () => {
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

		await service.cancel(alertId);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve chamar removeCron para remover o alerta.", async () => {
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

		await service.cancel(alertId);

		assertSpyCall(taskManagerSpy, 0);
		assertSpyCalls(taskManagerSpy, 1);
	});
});

const parameters = [
	"heartRate",
	"bloodPressure",
	"glicemia",
];
const patient = new Patient("1234", "John Doe");
const alert = Alert.create(patient, parameters);
const alertId = alert.alertId.toString();
