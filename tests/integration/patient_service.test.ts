import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { PatientService } from "application/patient_service.ts";
import {
	assert,
	assertEquals,
	assertInstanceOf,
	assertSpyCall,
	assertSpyCalls,
	spy,
} from "dev_deps";
import { Alert } from "domain/alerts/alert.ts";
import { ID } from "shared/id.ts";
import { InvalidDate } from "domain/patients/date_error.ts";
import { InvalidNumber } from "domain/patients/number_error.ts";
import { HospitalizationStatus } from "domain/patients/hospitalization.ts";
import { Patient, PatientStatus, Species } from "domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "domain/patients/patient_already_hospitalized_error.ts";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";
import {
	alert1,
	hospitalizationData,
	invalidComplaints,
	invalidDiagnostics,
	newPatientData,
	owner,
	patient1,
	patient2,
	patientWithSomeOwner,
} from "../fake_data.ts";
import { IDAlreadyExists } from "domain/patients/id_already_exists_error.ts";
import { OwnerNotFound } from "domain/patients/owner_not_found_error.ts";
import { Owner } from "domain/patients/owner.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";

Deno.test("Patient Service - Hospitalizad Patients", async (t) => {
	await t.step("Deve listar os pacientes hospitalzados.", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service } = makeService({ patientRepository });

		const patients = await service.hospitalizadPatients();

		assertEquals(patients.length, 0);
	});

	await t.step("Deve recuperar os pacientes hospitalizados.", async () => {
		const { service } = makeService();

		const patients = await service.hospitalizadPatients();

		assertEquals(patients.length, 2);
		assertEquals(patients[0].getStatus(), "HOSPITALIZADO");
	});

	// Analisar a relevancia desse teste
	await t.step(
		"Deve verificar no repositório se os pacientes tem alertas.",
		async () => {
			const { service, patientRepository, alertRepository } = makeService();
			patientRepository.save(patient1);
			patientRepository.save(patient2);
			const alertSpy = spy(alertRepository, "verify");

			await service.hospitalizadPatients();

			assertSpyCall(alertSpy, 0);
			assertSpyCalls(alertSpy, 2);
		},
	);

	await t.step(
		"Deve ser verdadeiro o **AlertStatus** se o paciente tiver alertas activos.",
		async () => {
			const { service, patientRepository, alertRepository } = makeService();
			patientRepository.save(patient1);
			patientRepository.save(patient2);
			alertRepository.save(alert1.value as Alert);

			await service.hospitalizadPatients();

			const patientOrErr = await patientRepository.getById(
				patient1.patientId,
			);

			const patient = <Patient> patientOrErr.value;

			assertEquals(patientOrErr.value, patient1);
			assertEquals(patient.hasAlert, true);
		},
	);
});

Deno.test("Patient Service - New Hospitalization", async (t) => {
	await t.step("Deve abrir uma nova hospitalização", async () => {
		const { service, patientRepository } = makeService();

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.fromString("some-patient-id"));

		assertEquals(patientOrErr.isRight(), true);

		const patient = <Patient> patientOrErr.value;
		assertEquals(patient.hospitalizations.length, 1);
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(
			patient.openHospitalization()!.status,
			HospitalizationStatus.OPEN,
		);
	});

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não foi encontrado.",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const error = await service.newHospitalization(
				"some-patient-id",
				hospitalizationData,
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);

	await t.step("Deve actualizar o paciente no repositório", async () => {
		const { service, patientRepository } = makeService();

		await service.newHospitalization("some-other-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.fromString("some-other-id"));

		const patient = <Patient> patientOrErr.value;
		assertEquals(patient.hospitalizations.length, 1);
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
	});

	await t.step("Deve registrar a data de entrada ao hospitalizar o paciente", async () => {
		const { service, patientRepository } = makeService();

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.fromString("some-patient-id"));
		const patient = <Patient> patientOrErr.value;
		const hospitalization = patient.openHospitalization()!;

		assertEquals(
			hospitalization.entryDate,
			new Date(hospitalizationData.entryDate),
		);
	});

	await t.step(
		"Deve retornar @InvalidDate se a data fornecia da entrada do paciente for inferior a data actual",
		async () => {
			const { service, patientRepository } = makeService();
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
			const patientId = "some-patient-id";
			const { service, patientRepository } = makeService();

			await service.newHospitalization(patientId, hospitalizationData);

			const patientOrErr = await patientRepository.getById(ID.fromString(patientId));

			const patient = <Patient> patientOrErr.value;
			const hospitalization = patient.openHospitalization()!;

			assertEquals(
				hospitalization.dischargeDate,
				new Date(hospitalizationData.dischargeDate),
			);
		},
	);

	await t.step(
		"Deve retornar @InvalidDate se a data de alta médica for inferior a data actual",
		async () => {
			const { service, patientRepository } = makeService();
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
			const { service } = makeService();

			const error = await service.newHospitalization(
				"some-patient-id",
				hospitalizationData,
			);
			assertInstanceOf(error.value, PatientAlreadyHospitalized);
		},
	);

	await t.step(
		"Deve registar o peso do paciente ao abrir uma hospitalização",
		async () => {
			const { service, patientRepository } = makeService();

			await service.newHospitalization("some-patient-id", hospitalizationData);

			const patientOrErr = await patientRepository.getById(
				ID.fromString("some-patient-id"),
			);
			const patient = <Patient> patientOrErr.value;
			const hospitalization = patient.openHospitalization()!;
			assertEquals(hospitalization.weight, 16.5);
		},
	);

	await t.step("Deve registar as queixas do paciente.", async () => {
		const { service, patientRepository } = makeService();

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(
			ID.fromString("some-patient-id"),
		);

		const patient = <Patient> patientOrErr.value;
		const hospitalization = patient.openHospitalization()!;
		const complaints = hospitalization.getComplaints();
		assertEquals(complaints.length, 2);
	});

	await t.step(
		"Deve retornar @InvalidNumber se o total de queixas for superior a 10.",
		async () => {
			const { service } = makeService();
			const error = await service.newHospitalization("some-dummy-id", {
				...hospitalizationData,
				complaints: invalidComplaints,
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step("Deve registar os diagnosticos do paciente.", async () => {
		const { service, patientRepository } = makeService();

		await service.newHospitalization("some-patient-id", hospitalizationData);

		const patientOrErr = await patientRepository.getById(
			ID.fromString("some-patient-id"),
		);
		const patient = <Patient> patientOrErr.value;
		const hospitalization = patient.openHospitalization()!;
		const diagnostics = hospitalization.getDiagnostics();

		assertEquals(diagnostics.length, 1);
	});

	await t.step(
		"Deve retornar @InvalidNumber se o total de diagnosticos for maior que 5",
		async () => {
			const { service } = makeService();

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
	await t.step("Deve retornar um lista vazia se não existirem pacientes", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service } = makeService({ patientRepository });

		const patients = await service.nonHospitalized();

		assertEquals(patients, []);
	});

	await t.step("Deve recuperar os pacientes não hospitalizados", async () => {
		const { service } = makeService();

		const patients = await service.nonHospitalized();

		assert(patients.length >= 0);
		assertEquals(patients[0].getStatus(), PatientStatus.DISCHARGED);
	});
});

Deno.test("Patient Service - New Patient", async (t) => {
	await t.step("Deve salvar o novo paciente no repositório", async () => {
		const { service, patientRepository } = makeService();
		const { patientData } = newPatientData;

		await service.newPatient(newPatientData);

		const patientOrErr = await patientRepository.getById(
			ID.fromString(patientData.patientId),
		);
		const patient = <Patient> patientOrErr.value;

		assertEquals(patientOrErr.isRight(), true);
		assertEquals(patient.patientId.value, patientData.patientId);
	});

	await t.step("Deve registar os dados do paciente", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service } = makeService({ patientRepository });
		const { patientData, ownerData } = newPatientData;

		await service.newPatient(newPatientData);

		const patientOrErr = await patientRepository.getById(
			ID.fromString(patientData.patientId),
		);

		const patient = <Patient> patientOrErr.value;

		assertEquals(patient.patientId.value, patientData.patientId);
		assertEquals(patient.name, patientData.name);
		assertEquals(patient.specie, patientData.specie);
		assertEquals(patient.breed, patientData.breed);
		assertEquals(patient.birthDate.value, new Date(patientData.birthDate));

		assertEquals(patient.owner.ownerId.value, ownerData.ownerId);
		assertEquals(patient.owner.name, ownerData.name);
		assertEquals(patient.owner.phoneNumber, ownerData.phoneNumber);
	});

	await t.step(
		"Deve registar os dados de hospitalização do paciente",
		async () => {
			const { service, patientRepository } = makeService();
			const { patientData } = newPatientData;

			await service.newPatient(newPatientData);

			const patientOrErr = await patientRepository.getById(
				ID.fromString(patientData.patientId),
			);

			const patient = <Patient> patientOrErr.value;

			assertEquals(patientOrErr.isRight(), true);
			assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		},
	);

	await t.step(
		"Deve retornar @IDAlreadyExists se ID do paciente já foi registrado.",
		async () => {
			const { service } = makeService();

			const error = await service.newPatient(newPatientData);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, IDAlreadyExists);
		},
	);

	await t.step("Deve salvar os dados do paciente com os dados do proprietário.", async () => {
		const { service, patientRepository } = makeService();

		const voidOrError = await service.newPatient(patientWithSomeOwner);

		assertEquals(voidOrError.isRight(), true);

		const patientOrErr = await patientRepository.getById(
			ID.fromString(patientWithSomeOwner.patientData.patientId),
		);

		const patient = <Patient> patientOrErr.value;
		assertEquals(patientOrErr.isRight(), true);
		assertEquals(
			patient.owner.ownerId.value,
			patientWithSomeOwner.ownerData.ownerId,
		);
	});

	await t.step("Deve gerar o identificador do sistema para o paciente", async () => {
		const { service, patientRepository } = makeService();

		await service.newPatient(patientWithSomeOwner);

		const patientOrErr = await patientRepository.getById(
			ID.fromString(patientWithSomeOwner.patientData.patientId),
		);

		const patient = <Patient> patientOrErr.value;

		assert(patient.systemId != undefined);
		assert(patient.systemId instanceof ID);
	});
});

Deno.test("Patient Service - Find Owner", async (t) => {
	await t.step("Deve chamar o método findOwner no repositório", async () => {
		const { service, patientRepository } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		const repoSpy = spy(patientRepository, "findOwner");

		await service.findOwner("1001");

		assertSpyCall(repoSpy, 0, { args: [ID.fromString("1001")] });
		assertSpyCalls(repoSpy, 1);
	});

	await t.step(
		"Deve recuperar o dono do paciente se ele existir no repositório.",
		async () => {
			const { service } = makeService();

			const ownerOrError = await service.findOwner("1001");

			const owner = <Owner> ownerOrError.value;
			assertEquals(owner.ownerId.value, "1001");
			assertEquals(owner.name, "John");
			assertEquals(owner.phoneNumber, "933001122");
		},
	);

	await t.step(
		"Deve retornar @OwnerNotFound se o dono não existir no repositório.",
		async () => {
			const { service } = makeService();

			const error = await service.findOwner("1002");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, OwnerNotFound);
		},
	);
});

const data = {
	patientId: "fake-id",
	name: "fake-name",
	breed: "fake-breed",
	specie: "fake-specie",
	birthDate: "2020-01-01",
};
const patient = new Patient(
	ID.random(),
	ID.fromString(data.patientId),
	data.name,
	data.breed,
	data.specie as Species,
	data.birthDate,
	owner,
);

interface Options {
	patientRepository?: PatientRepository;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ?? new PatientRepositoryStub();
	const alertRepository = new InmemAlertRepository();

	const service = new PatientService(patientRepository, alertRepository);
	return { service, patientRepository, alertRepository };
}
