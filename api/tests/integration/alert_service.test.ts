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
import { AlertStatus } from "../../domain/alerts/alert.ts";
import { ID } from "../../domain/id.ts";
import { Patient } from "../../domain/patients/patient.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";

Deno.test("Alert Service", async (t) => {
	await t.step("Deve buscar o paciente no repositório", () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const repoSpy = spy(patientRepository, "getById");
		const service = new AlertService(alertRepository, patientRepository);

		service.schedule("1234", parameters);

		assertSpyCall(repoSpy, 0, { args: [ID.New("1234")] });
		assertSpyCalls(repoSpy, 1);
	});
	await t.step("Deve lançar @PatientNotFound se o paciente não existir", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const service = new AlertService(alertRepository, patientRepository);
		const error = await service.schedule("1234", parameters);
		assertEquals(error.isLeft(), true);
		assertInstanceOf(error.value, PatientNotFound);
		assertEquals(error.value.message, "Patient not found");
	});
	await t.step("Deve salvar o paciente no repositório", async () => {
		const patientRepository = new InmemPatientRepository();
		patientRepository.save(patient);
		const alertRepository = new InmemAlertRepository();
		const repoSpy = spy(alertRepository, "save");
		const service = new AlertService(alertRepository, patientRepository);

		await service.schedule("1234", parameters);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});
	await t.step("Deve definir os parâmetros do alerta", async () => {
		const parameters = [
			"heartRate",
			"bloodPressure",
			"glicemia",
		];
		const patientRepository = new InmemPatientRepository();
		await patientRepository.save(patient);
		const alertRepository = new InmemAlertRepository();
		const service = new AlertService(alertRepository, patientRepository);
		await service.schedule("1234", parameters);
		const alerts = await alertRepository.findAll(ID.New("1234"));
		assertEquals(alerts.length, 1);
		assertEquals(alerts[0].getParameters(), parameters);
		assertEquals(alerts[0].getStatus(), AlertStatus.ENABLE);
	});
});

const parameters = [
	"heartRate",
	"bloodPressure",
	"glicemia",
];
const patient = new Patient("1234", "John Doe");
