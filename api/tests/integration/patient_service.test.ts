import { InmemAlertRepository } from "../../adaptors/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "../../adaptors/inmem/inmem_patient_repository.ts";
import { PatientService } from "../../application/patient_service.ts";
import {
	assertEquals,
	assertInstanceOf,
	assertSpyCall,
	assertSpyCalls,
	spy,
} from "../../dev_deps.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { ID } from "../../domain/id.ts";
import { HospitalizationStatus, Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { PatientRepositoryStub } from "../../test_double/stubs/patient_repository_stub.ts";

Deno.test("Patient Service - Hospitalizad Patients", async (t) => {
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

		const patientOrErr = await patientRepository.getById(patient1.patientId);
		const patient = patientOrErr.value as Patient;

		assertEquals(pacientes.length, 2);
		assertEquals(patientOrErr.isRight(), true);
		assertEquals(patientOrErr.value, patient1);
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

			const patientOrErr = await patientRepository.getById(patient1.patientId);

			assertEquals(patientOrErr.isRight(), true);
		},
	);
});

Deno.test("Patient Service - New Hospitalization", async (t) => {
	await t.step("Deve chamar o repositório para buscar o paciente", async () => {
		const { service, patientRepository } = makeService();

		const repoSpy = spy(patientRepository, "getById");
		await service.newHospitalization("some-patient-id", entryDate);
		assertSpyCall(repoSpy, 0, { args: [ID.New("some-patient-id")] });
		assertSpyCalls(repoSpy, 1);
	});
	await t.step(
		"Deve retornar @PatientNotFound se o paciente não foi encontrado.",
		async () => {
			const { service } = makeService();
			const error = await service.newHospitalization("some-patient-id", entryDate);
			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
			assertEquals(error.value.message, "Patient not found");
		},
	);
	await t.step("Deve abrir uma nova hospitalização", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", entryDate);

		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		assertEquals(patientOrErr.isRight(), true);

		const patient = patientOrErr.value as Patient;
		assertEquals(patient.hospitalizations.length, 1);
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.getActiveHospitalization()!.status, HospitalizationStatus.ACTIVE);
	});
	await t.step("Deve autalizar o paciente no repositório", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		const repoSpy = spy(patientRepository, "update");
		await service.newHospitalization("some-patient-id", entryDate);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});
	await t.step("A hospitalização deve receber a data de entrada", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await service.newHospitalization("some-patient-id", entryDate);

		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrErr.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.entryDate, new Date(entryDate));
	});
	await t.step(
		"Deve retornar @EntryDateInvalid se a data for inferior a data actual",
		async () => {
			const { service } = makeService();
			const error = await service.newHospitalization(
				"some-patient-id",
				"2020-01-01:00:00:00",
			);
			assertInstanceOf(error, EntryDateInvalid);
		},
	);
});

const entryDate = new Date().toISOString();
const patient1 = new Patient("PT - 1292/2023", "Rex");
const patient2 = new Patient("PT - 392/2022", "Huston");
patient1.hospitalize(entryDate);
patient2.hospitalize(entryDate);
const alert1 = new Alert(patient1);

interface Options {
	patientRepository?: PatientRepository;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ?? new InmemPatientRepository();
	const alertRepository = new InmemAlertRepository();
	const service = new PatientService(patientRepository, alertRepository);
	return { service, patientRepository };
}
