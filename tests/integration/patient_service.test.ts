import { InmemAlertRepository } from "../../adaptors/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "../../adaptors/inmem/inmem_patient_repository.ts";
import { PatientService } from "../../application/patient_service.ts";
import {
	assert,
	assertEquals,
	assertInstanceOf,
	assertSpyCall,
	assertSpyCalls,
	spy,
} from "../../dev_deps.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { ID } from "../../domain/id.ts";
import { InvalidDate } from "../../domain/patients/date_error.ts";
import { InvalidNumber } from "../../domain/patients/number_error.ts";
import { HospitalizationStatus } from "../../domain/patients/hospitalization.ts";
import { Patient, PatientStatus } from "../../domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "../../domain/patients/patient_already_hospitalized_error.ts";
import { PatientNotFound } from "../../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { PatientRepositoryStub } from "../test_double/stubs/patient_repository_stub.ts";
import {
	alert1,
	hospitalizationData,
	invalidComplaints,
	invalidDiagnostics,
	newPatientData,
	owner,
	patient1,
	patient2,
} from "../fake_data.ts";
import { IDAlreadyExists } from "../../domain/patients/id_already_exists_error.ts";

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
		const patient = <Patient> patientOrError.value;

		assertEquals(pacientes.length, 2);
		assertEquals(patientOrError.isRight(), true);
		assertEquals(patientOrError.value, patient1);
		assertEquals(patient.patientId.getValue(), "some-patient-id");
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
			alertRepository.save(alert1.value as Alert);

			await service.hospitalizadPatients();

			const patientOrError = await patientRepository.getById(patient1.patientId);

			const patient = <Patient> patientOrError.value;

			assertEquals(patientOrError.value, patient1);
			assertEquals(patient.hasAlert, true);
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
		},
	);

	await t.step("Deve abrir uma nova hospitalização", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));

		assertEquals(patientOrError.isRight(), true);

		const patient = <Patient> patientOrError.value;
		assertEquals(patient.hospitalizations.length, 1);
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.openHospitalization()!.status, HospitalizationStatus.OPEN);
	});

	await t.step("Deve actualizar o paciente no repositório", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		const repoSpy = spy(patientRepository, "update");

		await service.newHospitalization("some-other-id", hospitalizationData);

		assertSpyCall(repoSpy, 0);
		assertSpyCalls(repoSpy, 1);

		const patientOrError = await patientRepository.getById(ID.New("some-other-id"));
		const patient = <Patient> patientOrError.value;

		assertEquals(patient.hospitalizations.length, 1);
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
	});

	await t.step("A hospitalização deve receber a data de entrada", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
		const hospitalization = patient.openHospitalization()!;

		assertEquals(hospitalization.entryDate, new Date(hospitalizationData.entryDate));
	});

	await t.step(
		"Deve retornar @InvalidDate se a data fornecia da entrada do paciente for inferior a data actual",
		async () => {
			const { service, patientRepository } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const patient = Patient.create({
				patientId: "fake-id",
				name: "fake-name",
				breed: "fake-breed",
				specie: "fake-specie",
				birthDate: "2020-01-01",
			}, owner);
			await patientRepository.save(patient);

			const error = await service.newHospitalization("fake-id", {
				...hospitalizationData,
				entryDate: "2020-01-01",
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidDate);
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
			const hospitalization = patient.openHospitalization()!;

			assertEquals(
				hospitalization.dischargeDate,
				new Date(hospitalizationData.dischargeDate),
			);
		},
	);

	await t.step(
		"Deve retornar @InvalidDate se a data fornecia da alta médica for inferior a data actual",
		async () => {
			const { service, patientRepository } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const patient = Patient.create({
				patientId: "fake-id",
				name: "fake-name",
				breed: "fake-breed",
				specie: "fake-specie",
				birthDate: "2020-01-01",
			}, owner);
			await patientRepository.save(patient);

			const error = await service.newHospitalization("fake-id", {
				...hospitalizationData,
				dischargeDate: "2020-01-01",
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidDate);
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
		const patient = <Patient> patientOrError.value;
		const hospitalization = patient.openHospitalization()!;
		assertEquals(hospitalization.weight, 16.5);
	});

	await t.step("Deve registar as queixas do paciente.", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await service.newHospitalization(
			"some-patient-id",
			hospitalizationData,
		);
		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
		const hospitalization = patient.openHospitalization()!;
		const complaints = hospitalization.getComplaints();
		assertEquals(complaints.length, 2);
	});

	await t.step(
		"Deve retornar @InvalidNumber se o total de queixas for superior a 10.",
		async () => {
			const { service } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			const error = await service.newHospitalization(
				"some-dummy-id",
				{
					...hospitalizationData,
					complaints: invalidComplaints,
				},
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step("Deve registar os diagnosticos do paciente.", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrError = await patientRepository.getById(ID.New("some-patient-id"));
		const patient = patientOrError.value as Patient;
		const hospitalization = patient.openHospitalization()!;
		const diagnostics = hospitalization.getDiagnostics();

		assertEquals(diagnostics.length, 1);
	});

	await t.step(
		"Deve retornar @InvalidNumber se o total de diagnosticos for maior que 5",
		async () => {
			const { service } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			const error = await service.newHospitalization("some-dummy-id", {
				...hospitalizationData,
				diagnostics: invalidDiagnostics,
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);
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
		const patients = <Patient[]> patientsOrError.value;

		assert(patients.length >= 0);
	});
});

Deno.test("Patient Service - New Patient", async (t) => {
	await t.step("Deve chamar o método save no repositório", async () => {
		const { service, patientRepository } = makeService();
		const patientSpy = spy(patientRepository, "save");

		await service.newPatient(newPatientData);

		assertSpyCall(patientSpy, 0);
		assertSpyCalls(patientSpy, 1);
	});

	await t.step("Deve salvar o novo paciente no repositório", async () => {
		const { service, patientRepository } = makeService();
		const { patientData } = newPatientData;

		await service.newPatient(newPatientData);

		const patientOrError = await patientRepository.getById(ID.New(patientData.patientId));
		const patient = <Patient> patientOrError.value;

		assertEquals(patientOrError.isRight(), true);
		assertEquals(patient.patientId.getValue(), patientData.patientId);
	});

	await t.step("Deve registar os dados do paciente", async () => {
		const { service, patientRepository } = makeService();
		const { patientData, ownerData } = newPatientData;

		await service.newPatient(newPatientData);

		const patientOrError = await patientRepository.getById(ID.New(patientData.patientId));
		assertEquals(patientOrError.isRight(), true);

		const patient = <Patient> patientOrError.value;

		assertEquals(patient.patientId.getValue(), patientData.patientId);
		assertEquals(patient.name, patientData.name);
		assertEquals(patient.specie, patientData.specie);
		assertEquals(patient.breed, patientData.breed);
		assertEquals(patient.birthDate.value, new Date(patientData.birthDate));

		assertEquals(patient.owner.ownerId.getValue(), ownerData.ownerId);
		assertEquals(patient.owner.name, ownerData.name);
		assertEquals(patient.owner.phoneNumber, ownerData.phoneNumber);
	});

	await t.step("Deve registar os dados de hospitalização do paciente", async () => {
		const { service, patientRepository } = makeService();
		const { patientData } = newPatientData;

		await service.newPatient(newPatientData);

		const patientOrError = await patientRepository.getById(ID.New(patientData.patientId));
		assertEquals(patientOrError.isRight(), true);

		const patient = <Patient> patientOrError.value;

		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
	});

	await t.step("Deve verificar se ID do paciente já foi registrado.", async () => {
		const { service, patientRepository } = makeService();
		const repoSpy = spy(patientRepository, "exists");

		await service.newPatient(newPatientData);

		assertSpyCall(repoSpy, 0, { args: [ID.New(newPatientData.patientData.patientId)] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step("Deve retonar @IDAlreadyExists se ID do paciente já foi registrado.", async () => {
		const { service } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		const error = await service.newPatient(newPatientData);

		assertEquals(error.isLeft(), true);
		assertInstanceOf(error.value, IDAlreadyExists);
	});
});

interface Options {
	patientRepository?: PatientRepository;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ?? new InmemPatientRepository();
	const alertRepository = new InmemAlertRepository();
	const deps = {
		alertRepository,
		patientRepository,
	};
	const service = new PatientService(deps);
	return { service, patientRepository, alertRepository };
}
