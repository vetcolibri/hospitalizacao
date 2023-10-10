import { InmemAlertRepository } from "../../adaptors/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "../../adaptors/inmem/inmem_patient_repository.ts";
import { PatientService } from "../../application/patient_service.ts";
import { assertEquals, assertSpyCall, assertSpyCalls, spy } from "../../dev_deps.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { Hospitalization, Patient } from "../../domain/patients/patient.ts";

Deno.test("Patient Service", async (t) => {
	await t.step("Deve listar os pacientes hospitalzados.", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const service = new PatientService(patientRepository, alertRepository);

		const patients = await service.hospitalizadPatients();

		assertEquals(patients.length, 0);
	});
	await t.step("Deve buscar no repositório os pacientes hospitalzados.", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		const service = new PatientService(patientRepository, alertRepository);
		const patientRepositorySpy = spy(patientRepository, "hospitalized");

		await service.hospitalizadPatients();

		assertSpyCall(patientRepositorySpy, 0);
		assertSpyCalls(patientRepositorySpy, 1);
	});
	await t.step("Deve recuperar os dois pacientes hospitalizados.", async () => {
		const patientRepository = new InmemPatientRepository();
		patientRepository.save(patient1);
		patientRepository.save(patient2);
		const alertRepository = new InmemAlertRepository();
		const service = new PatientService(patientRepository, alertRepository);

		const pacientes = await service.hospitalizadPatients();

		const patient = await patientRepository.get(patient1.patientId);

		assertEquals(pacientes.length, 2);
		assertEquals(patient.patientId.toString(), "PT - 1292/2023");
		assertEquals(patient.getStatus(), "HOSPITALIZADO");
	});

	await t.step("Deve verificar no repositório se os pacientes tem alertas.", async () => {
		const patientRepository = new InmemPatientRepository();
		const alertRepository = new InmemAlertRepository();
		patientRepository.save(patient1);
		patientRepository.save(patient2);
		const service = new PatientService(patientRepository, alertRepository);
		const alertSpy = spy(alertRepository, "verify");

		await service.hospitalizadPatients();

		assertSpyCall(alertSpy, 0);
		assertSpyCalls(alertSpy, 2);
	});

	await t.step(
		"Deve ser verdadeiro o **AlertStatus** se o paciente tiver alertas activos.",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const alertRepository = new InmemAlertRepository();
			patientRepository.save(patient1);
			patientRepository.save(patient2);
			alertRepository.save(alert1);
			const service = new PatientService(patientRepository, alertRepository);

			await service.hospitalizadPatients();

			const patient = await patientRepository.get(patient1.patientId);

			assertEquals(patient.alertStatus, true);
		},
	);
});

const date = new Date().toISOString();
const hospitalization = new Hospitalization(date);
const patient1 = new Patient("PT - 1292/2023", "Rex");
const patient2 = new Patient("PT - 392/2022", "Huston");
patient1.hospitalize(hospitalization);
patient2.hospitalize(hospitalization);
const alert1 = new Alert(patient1);
