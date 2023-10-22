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
import { DateInvalid } from "../../domain/patients/date_invalid_error.ts";
import { HospitalizationStatus } from "../../domain/patients/hospitalization.ts";
import { Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "../../domain/patients/patient_already_hospitalized_error.ts";
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

		await service.newHospitalization("some-patient-id", hospitalizationData);

		assertSpyCall(repoSpy, 0, { args: [ID.New("some-patient-id")] });
		assertSpyCalls(repoSpy, 1);
	});
	await t.step(
		"Deve retornar @PatientNotFound se o paciente não foi encontrado.",
		async () => {
			const { service } = makeService();

			const error = await service.newHospitalization("some-patient-id", hospitalizationData);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
			assertEquals(error.value.message, "Patient not found");
		},
	);
	await t.step("Deve abrir uma nova hospitalização", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		assertEquals(patientOrErr.isRight(), true);

		const patient = patientOrErr.value as Patient;
		assertEquals(patient.hospitalizations.length, 1);
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.getActiveHospitalization()!.status, HospitalizationStatus.ACTIVE);
	});
	await t.step("Deve actualizar o paciente no repositório", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		const repoSpy = spy(patientRepository, "update");

		await service.newHospitalization("some-patient-id", hospitalizationData);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});
	await t.step("A hospitalização deve receber a data de entrada", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrErr.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.entryDate, new Date(hospitalizationData.entryDate));
	});
	await t.step(
		"Deve retornar @DateInvalid se a data fornecia for inferior a data actual",
		async () => {
			const { service } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const error = await service.newHospitalization("some-patient-id", invalidEntryDate);
			assertInstanceOf(error.value, DateInvalid);
		},
	);
	await t.step(
		"Ao hospitalizar um paciente deve receber a data prevista para alta.",
		async () => {
			const { service, patientRepository } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			await service.newHospitalization("some-patient-id", hospitalizationData);

			const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
			const patient = <Patient> patientOrErr.value;
			const hospitalization = patient.getActiveHospitalization()!;
			assertEquals(
				hospitalization.dischargeDate,
				new Date(hospitalizationData.dischargeDate),
			);
		},
	);
	await t.step(
		"Deve retornar @DateInvalid se a data fornecia for inferior a data de entrada",
		async () => {
			const { service } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			const error = await service.newHospitalization("some-patient-id", invalidDischargeDate);
			assertInstanceOf(error.value, DateInvalid);
		},
	);

	await t.step(
		"Ao hospitalizar um paciente deve receber a previsão do orçamento.",
		async () => {
			const { service, patientRepository } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			await service.newHospitalization("some-patient-id", hospitalizationData);

			const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
			const patient = patientOrErr.value as Patient;
			const hospitalization = patient.getActiveHospitalization()!;
			assertEquals(
				hospitalization.estimatedBudgetDate,
				new Date(hospitalizationData.estimatedBudgetDate),
			);
		},
	);

	await t.step(
		"Deve retornar @DateInvalid se a data fornecia for inferior a data prevista do orçamento",
		async () => {
			const { service } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const error = await service.newHospitalization(
				"some-patient-id",
				invalidEstimatedBudgetDate,
			);
			assertInstanceOf(error.value, DateInvalid);
		},
	);

	await t.step(
		"Deve retornar um erro @PatientAlreadyHospitalized se o paciente já estiver hospitalizado",
		async () => {
			const { service } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			const error = await service.newHospitalization("some-id", hospitalizationData);
			assertInstanceOf(error.value, PatientAlreadyHospitalized);
		},
	);
	await t.step("Deve registar o peso do paciente a hospitalização·", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrErr.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.weight, 16.5);
	});

	await t.step("Deve registar a idade do paciente·", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrErr.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.age, 10);
	});
	await t.step("Deve registar a queixa do paciente.", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await service.newHospitalization(
			"some-patient-id",
			hospitalizationData,
		);
		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrErr.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.complaints, "Queixa 1");
	});
	await t.step("Deve registar o diagnostico do paciente.", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await service.newHospitalization("some-patient-id", hospitalizationData);
		const patientOrErr = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrErr.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.diagnostics, "Diagnostico 1");
	});
});

Deno.test("Patient Service - Get Patient", async (t) => {
	await t.step("Deve retornar um erro @PatientNotFound se o paciente não existir.", async () => {
		const { service } = makeService();
		const error = await service.findPatient("some-id");
		assertInstanceOf(error.value, PatientNotFound);
	});
	await t.step("Deve retornar o paciente.", async () => {
		const { service } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		const result = await service.findPatient("some-id");
		const patient = result.value as Patient;
		assertEquals(patient.patientId.toString(), "some-id");
	});
});

const hospitalizationData = {
	entryDate: new Date().toLocaleDateString(),
	dischargeDate: new Date().toLocaleDateString(),
	estimatedBudgetDate: new Date().toLocaleDateString(),
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

const invalidEntryDate = {
	entryDate: "01/01/2020",
	dischargeDate: new Date().toLocaleDateString(),
	estimatedBudgetDate: new Date().toLocaleDateString(),
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

const invalidDischargeDate = {
	entryDate: new Date().toLocaleDateString(),
	dischargeDate: "01/01/2020",
	estimatedBudgetDate: new Date().toLocaleDateString(),
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

const invalidEstimatedBudgetDate = {
	entryDate: new Date().toLocaleDateString(),
	dischargeDate: new Date().toLocaleDateString(),
	estimatedBudgetDate: "01/01/2020",
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

const patient1 = new Patient("PT - 1292/2023", "Rex");
const patient2 = new Patient("PT - 392/2022", "Huston");
patient1.hospitalize(hospitalizationData);
patient2.hospitalize(hospitalizationData);
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
