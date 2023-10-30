import { InmemAlertRepository } from "../../adaptors/inmem/inmem_alert_repository.ts";
import { InmemIdRepository } from "../../adaptors/inmem/inmem_id_repository.ts";
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
import {
	hospitalizationData,
	invalidDischargeDate,
	invalidEntryDate,
	invalidEstimatedBudgetDate,
	newPatientData,
	owner,
	patient1,
	patient2,
} from "../fake_data.ts";

Deno.test("Patient Service - Hospitalizad Patients", async (t) => {
	await t.step("Deve listar os pacientes hospitalzados.", async () => {
		const { service } = makeService();

		const patients = await service.hospitalizadPatients();

		assertEquals(patients.length, 0);
	});

	await t.step("Deve buscar no repositório os pacientes hospitalzados.", async () => {
		const { service, patientRepository } = makeService();
		const patientRepositorySpy = spy(patientRepository, "hospitalized");

		await service.hospitalizadPatients();

		assertSpyCall(patientRepositorySpy, 0);
		assertSpyCalls(patientRepositorySpy, 1);
	});

	await t.step("Deve recuperar os dois pacientes hospitalizados.", async () => {
		const { service, patientRepository } = makeService();
		patientRepository.save(patient1);
		patientRepository.save(patient2);

		const pacientes = await service.hospitalizadPatients();

		const patientOrError = await patientRepository.getById(patient1.patientId);
		const patient = patientOrError.value as Patient;

		assertEquals(pacientes.length, 2);
		assertEquals(patientOrError.isRight(), true);
		assertEquals(patientOrError.value, patient1);
		assertEquals(patient.patientId.toString(), "some-patient-id");
		assertEquals(patient.getStatus(), "HOSPITALIZADO");
	});

	await t.step("Deve verificar no repositório se os pacientes tem alertas.", async () => {
		const { service, patientRepository, alertRepository } = makeService();
		patientRepository.save(patient1);
		patientRepository.save(patient2);
		const alertSpy = spy(alertRepository, "verify");

		await service.hospitalizadPatients();

		assertSpyCall(alertSpy, 0);
		assertSpyCalls(alertSpy, 2);
	});

	await t.step(
		"Deve ser verdadeiro o **AlertStatus** se o paciente tiver alertas activos.",
		async () => {
			const { service, patientRepository, alertRepository } = makeService();
			patientRepository.save(patient1);
			patientRepository.save(patient2);
			alertRepository.save(alert1);

			await service.hospitalizadPatients();

			const patientOrError = await patientRepository.getById(patient1.patientId);

			assertEquals(patientOrError.isRight(), true);
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

		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		assertEquals(patientOrError.isRight(), true);

		const patient = patientOrError.value as Patient;
		assertEquals(patient.hospitalizations.length, 1);
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.getActiveHospitalization()!.status, HospitalizationStatus.ACTIVE);
	});

	await t.step("Deve actualizar o paciente no repositório", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		const repoSpy = spy(patientRepository, "update");

		await service.newHospitalization("some-other-id", hospitalizationData);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("A hospitalização deve receber a data de entrada", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.entryDate, new Date(hospitalizationData.entryDate));
	});

	await t.step(
		"Deve retornar @DateInvalid se a data fornecia da entrada do paciente for inferior a data actual",
		async () => {
			const { service, patientRepository } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const patient = new Patient("fake-id", "fake-name", "fake-breed", owner);
			await patientRepository.save(patient);
			const error = await service.newHospitalization("fake-id", invalidEntryDate);
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

			const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
			const patient = <Patient> patientOrError.value;
			const hospitalization = patient.getActiveHospitalization()!;
			assertEquals(
				hospitalization.dischargeDate,
				new Date(hospitalizationData.dischargeDate),
			);
		},
	);

	await t.step(
		"Deve retornar @DateInvalid se a data fornecia da alta médica for inferior a data actual",
		async () => {
			const { service, patientRepository } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const patient = new Patient("fake-id", "fake-name", "fake-breed", owner);
			await patientRepository.save(patient);
			const error = await service.newHospitalization("fake-id", invalidDischargeDate);
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

			const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
			const patient = patientOrError.value as Patient;
			const hospitalization = patient.getActiveHospitalization()!;
			assertEquals(
				hospitalization.estimatedBudgetDate,
				new Date(hospitalizationData.estimatedBudgetDate),
			);
		},
	);

	await t.step(
		"Deve retornar @DateInvalid se a data fornecia do orçamento for inferior a data actual",
		async () => {
			const { service, patientRepository } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const patient = new Patient("fake-id", "fake-name", "fake-breed", owner);
			await patientRepository.save(patient);
			const error = await service.newHospitalization(
				"fake-id",
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

			const error = await service.newHospitalization("some-patient-id", hospitalizationData);
			assertInstanceOf(error.value, PatientAlreadyHospitalized);
		},
	);
	await t.step("Deve registar o peso do paciente a hospitalização·", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.weight, 16.5);
	});

	await t.step("Deve registar a idade do paciente·", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
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
		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.complaints, "Queixa 1");
	});
	await t.step("Deve registar o diagnostico do paciente.", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await service.newHospitalization("some-patient-id", hospitalizationData);
		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
		const hospitalization = patient.getActiveHospitalization()!;
		assertEquals(hospitalization.diagnostics, "Diagnostico 1");
	});
});

Deno.test("Patient Service - Non Hospitalized Patients", async (t) => {
	await t.step("Deve chamar o método nonHospitalized no repositório", async () => {
		const { service, patientRepository } = makeService();
		const repoSpy = spy(patientRepository, "nonHospitalized");

		await service.nonHospitalized();

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve recuperar os pacientes não hospitalizados", async () => {
		const { service } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		const patientsOrError = await service.nonHospitalized();
		const patients = patientsOrError.value as Patient[];

		assertEquals(patients.length, 1);
		assertEquals(patients[0].name, "Huston 1");
	});
});

Deno.test("Patient Service - New Patient", async (t) => {
	await t.step("Deve gerar um ID para o novo paciente", async () => {
		const { service, idRepository } = makeService();
		const idSpy = spy(idRepository, "generate");

		await service.newPatient(newPatientData);

		const id = await idRepository.lastId();

		assertSpyCall(idSpy, 0);
		assertSpyCalls(idSpy, 1);
		assertEquals(id, 1);
	});

	await t.step("Deve ter no ID gerado o nome do paciente e o nome do proprietário", async () => {
		const { service, idRepository } = makeService();
		const idSpy = spy(idRepository, "generate");

		await service.newPatient(newPatientData);

		const newId = await idRepository.newId();

		assertSpyCall(idSpy, 0, { args: ["Rex", "Huston"] });
		assertSpyCalls(idSpy, 1);
		assertEquals(newId, "0001-rex-huston");
	});

	await t.step("Deve chamar o método save no repositório", async () => {
		const { service, patientRepository } = makeService();
		const patientSpy = spy(patientRepository, "save");

		await service.newPatient(newPatientData);

		assertSpyCall(patientSpy, 0);
		assertSpyCalls(patientSpy, 1);
	});

	await t.step("Deve salvar o novo paciente no repositório", async () => {
		const { service, patientRepository, idRepository } = makeService();

		await service.newPatient(newPatientData);

		const newId = await idRepository.newId();

		const patientOrError = await patientRepository.getById(ID.New(newId));
		const patient = <Patient> patientOrError.value;

		assertEquals(patientOrError.isRight(), true);
		assertEquals(patient.patientId.toString(), newId);
	});

	await t.step("Deve registar os dados do paciente", async () => {
		const { service, patientRepository, idRepository } = makeService();
		const { patientData } = newPatientData;

		await service.newPatient(newPatientData);

		const newId = await idRepository.newId();

		const patientOrError = await patientRepository.getById(ID.New(newId));
		assertEquals(patientOrError.isRight(), true);

		const patient = <Patient> patientOrError.value;
		assertEquals(patient.name, patientData.name);
		assertEquals(patient.specie, patientData.specie);
		assertEquals(patient.breed, patientData.breed);
		assertEquals(patient.owner.ownerId, patientData.ownerId);
		assertEquals(patient.owner.name, patientData.ownerName);
		assertEquals(patient.owner.phoneNumber, patientData.phoneNumber);
	});

	await t.step("Deve registar os dados de hospitalização do paciente", async () => {
		const { service, patientRepository, idRepository } = makeService();

		await service.newPatient(newPatientData);

		const newId = await idRepository.newId();

		const patientOrError = await patientRepository.getById(ID.New(newId));
		assertEquals(patientOrError.isRight(), true);

		const patient = <Patient> patientOrError.value;

		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
	});
});

const alert1 = Alert.create(
	patient1,
	["heartRate", "bloodPressure", "glicemia"],
	120,
	"dummy",
	new Date().toLocaleDateString(),
);

interface Options {
	patientRepository?: PatientRepository;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ?? new InmemPatientRepository();
	const alertRepository = new InmemAlertRepository();
	const idRepository = new InmemIdRepository();
	const service = new PatientService(patientRepository, alertRepository, idRepository);
	return { service, patientRepository, idRepository, alertRepository };
}
