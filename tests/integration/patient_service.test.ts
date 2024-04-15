import { PatientService } from "application/patient_service.ts";
import { assert, assertEquals, assertInstanceOf } from "dev_deps";
import { BudgetStatus } from "../../src/domain/patients/hospitalizations/budget.ts";
import { InvalidDate } from "../../src/domain/patients/hospitalizations/invalid_date_error.ts";
import { PatientIdAlreadyExists } from "../../src/domain/patients/patient_id_already_exists_error.ts";
import { InvalidNumber } from "../../src/domain/patients/hospitalizations/invalid_number_error.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { ID } from "shared/id.ts";
import { HospitalizationRepository } from "../../src/domain/patients/hospitalizations/hospitalization_repository.ts";
import { OwnerRepository } from "../../src/domain/patients/owners/owner_repository.ts";
import { InmemHospitalizationRepository } from "../../src/persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "../../src/persistence/inmem/inmem_owner_repository.ts";
import {
	hospitalizationData,
	invalidComplaints,
	invalidDiagnostics,
	newPatientData,
	patient1,
} from "../fake_data.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { PatientAlreadyHospitalized } from "domain/patients/patient_already_hospitalized_error.ts";
import { InmemBudgetRepository } from "../../src/persistence/inmem/inmem_budget_repository.ts";
import { Owner } from "domain/patients/owners/owner.ts";

Deno.test("Patient Service - Hospitalizad Patients", async (t) => {
	await t.step(
		"Deve retornar uma lista vazia se não existirem pacientes hospitalizados.",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const patients = await service.listHospitalizad();

			assertEquals(patients, []);
		},
	);

	await t.step("Deve recuperar os pacientes hospitalzados no repositório.", async () => {
		const { service } = makeService();

		const patients = await service.listHospitalizad();

		assertEquals(patients.every((p) => p.status === PatientStatus.Hospitalized), true);
	});
});

Deno.test("Patient Service - New Hospitalization", async (t) => {
	await t.step("Deve abrir uma nova hospitalização", async () => {
		const { service, patientRepository, hospitalizationRepository } = makeService();

		await service.newHospitalization("1919B", hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.fromString("1919B"));
		const patient = <Patient> patientOrErr.value;

		const hospitalization = await hospitalizationRepository.open(patient.systemId);

		assertEquals(patient.status, PatientStatus.Hospitalized);
		assertEquals(hospitalization.patientId.value, patient.systemId.value);
	});

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não foi encontrado.",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const error = await service.newHospitalization(
				"1781GD",
				hospitalizationData,
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);

	await t.step(
		"Deve retornar um erro @PatientAlreadyHospitalized se o paciente já estiver hospitalizado",
		async () => {
			const { service } = makeService();

			const error = await service.newHospitalization(
				"1919B",
				hospitalizationData,
			);
			assertInstanceOf(error.value, PatientAlreadyHospitalized);
		},
	);

	await t.step(
		"Deve retornar @InvalidNumber se o número de queixas for maior que 10",
		async () => {
			const patientRepository = new InmemPatientRepository();
			patient1.discharge();
			patientRepository.save(patient1);

			const { service } = makeService({ patientRepository });

			const error = await service.newHospitalization(
				patient1.systemId.value,
				{ ...hospitalizationData, complaints: invalidComplaints },
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step(
		"Deve retornar @InvalidNumber se o número de diagnosticos for maior que 5",
		async () => {
			const patientRepository = new InmemPatientRepository();
			patient1.discharge();
			patientRepository.save(patient1);

			const { service } = makeService({ patientRepository });

			const error = await service.newHospitalization(
				patient1.systemId.value,
				{ ...hospitalizationData, diagnostics: invalidDiagnostics },
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step(
		"Deve retornar @InvalidDate se a data de alta médica for inferior a data actual",
		async () => {
			const patientRepository = new InmemPatientRepository();
			patient1.discharge();
			patientRepository.save(patient1);
			const entryDate = new Date().getTime() + 1000 * 60 * 60 * 24;

			const { service } = makeService({ patientRepository });

			const error = await service.newHospitalization(
				patient1.systemId.value,
				{ ...hospitalizationData, entryDate: new Date(entryDate).toISOString() },
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidDate);
		},
	);
});

Deno.test("Patient Service - Non Hospitalized Patients", async (t) => {
	await t.step("Deve retornar um lista vazia se não existirem pacientes", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service } = makeService({ patientRepository });

		const patients = await service.listNonHospitalized();

		assertEquals(patients, []);
	});

	await t.step("Deve recuperar os pacientes não hospitalizados", async () => {
		const { service } = makeService();

		const patients = await service.listNonHospitalized();

		assert(patients.every((p) => p.status === PatientStatus.Discharged));
	});
});

Deno.test("Patient Service - New Patient", async (t) => {
	await t.step("Deve criar um novo paciente", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service } = makeService({ patientRepository });
		const { patientData } = newPatientData;

		await service.newPatient(newPatientData);

		const patient = await patientRepository.last();

		assertEquals(patient.patientId.value, patientData.patientId);
		assertEquals(patient.status, PatientStatus.Hospitalized);
	});

	await t.step("Deve registrar os dados do proprietário no repositório", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service, ownerRepository } = makeService({ patientRepository });

		const ownerData = {
			ownerId: "1956C",
			name: "John",
			phoneNumber: "933001122",
		};

		await service.newPatient({ ...newPatientData, ownerData });

		const owner = await ownerRepository.last();

		assertEquals(owner.ownerId.value, "1956C");
	});

	await t.step("Deve registrar o paciente com o ID do proprietário.", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service } = makeService({ patientRepository });

		const ownerData = {
			ownerId: "1956B",
			name: "John",
			phoneNumber: "933001122",
		};

		await service.newPatient({ ...newPatientData, ownerData });

		const patient = await patientRepository.last();

		assertEquals(patient.ownerId.value, ownerData.ownerId);
	});

	await t.step("Deve registrar o paciente com o ID de um proprietário existente.", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service, ownerRepository } = makeService({ patientRepository });
		const owner = new Owner("1956B", "John", "933001122");

		await ownerRepository.save(owner);

		await service.newPatient({
			...newPatientData,
			ownerData: {
				ownerId: "1956B",
				name: "John",
				phoneNumber: "933001122",
			},
		});

		const patient = await patientRepository.last();

		assertEquals(patient.ownerId.value, owner.ownerId.value);
	});

	await t.step("Deve gerar o identificador do sistema para o paciente", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service } = makeService({ patientRepository });

		await service.newPatient(newPatientData);

		const patient = await patientRepository.last();

		assert(patient.systemId != undefined);
		assert(patient.systemId instanceof ID);
	});

	await t.step("Deve registrar os dados da hospitalização do paciente", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service, hospitalizationRepository } = makeService({ patientRepository });

		await service.newPatient(newPatientData);

		const hospitalization = await hospitalizationRepository.last();

		assert(hospitalization.patientId.value !== undefined);
		assertEquals(hospitalization.weight, 16.5);
		assertEquals(hospitalization.complaints.length, 2);
		assertEquals(hospitalization.diagnostics.length, 1);
		assertEquals(hospitalization.entryDate.toISOString(), new Date("2021-01-01").toISOString());
	});

	await t.step(
		"Deve retornar @InvalidNumber se o número de queixas for maior que 10",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const error = await service.newPatient({
				...newPatientData,
				hospitalizationData: {
					...newPatientData.hospitalizationData,
					complaints: invalidComplaints,
				},
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step(
		"Deve retornar @InvalidNumber se o número de diagnosticos for maior que 5",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const error = await service.newPatient({
				...newPatientData,
				hospitalizationData: {
					...newPatientData.hospitalizationData,
					diagnostics: invalidDiagnostics,
				},
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step(
		"Deve retornar @InvalidDate se a data de nascimento for maior que a data actual",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });
			const invalidBirthDate = new Date().getTime() + 1000 * 60 * 60 * 24;

			const error = await service.newPatient({
				...newPatientData,
				patientData: {
					...newPatientData.patientData,
					birthDate: new Date(invalidBirthDate).toISOString(),
				},
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidDate);
		},
	);

	await t.step(
		"Deve retornar @IDAlreadyExists se ID do paciente já foi registrado.",
		async () => {
			const { service } = makeService();

			const error = await service.newPatient(newPatientData);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientIdAlreadyExists);
		},
	);

	await t.step(
		"Deve retornar @InvalidDate se a data de entrada na hospitalização for a data actual",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const invalidEntryDate = new Date().getTime() + 1000 * 60 * 60 * 24;

			const { service } = makeService({ patientRepository });

			const error = await service.newPatient({
				...newPatientData,
				hospitalizationData: {
					...newPatientData.hospitalizationData,
					entryDate: new Date(invalidEntryDate).toISOString(),
				},
			});

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidDate);
		},
	);

	await t.step("Deve registrar os dados do orçamento para a hospitalização", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service, budgetRepository } = makeService({ patientRepository });

		await service.newPatient(newPatientData);

		const budget = await budgetRepository.last();

		assert(budget.hospitalizationId.value !== undefined);
		assertEquals(budget.status, BudgetStatus.UnPaid);
	});
});

interface Options {
	patientRepository?: PatientRepository;
	ownerRepository?: OwnerRepository;
	hospitalizationRepository?: HospitalizationRepository;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ?? new PatientRepositoryStub();
	const ownerRepository = options?.ownerRepository ?? new InmemOwnerRepository();
	const hospitalizationRepository = options?.hospitalizationRepository ??
		new InmemHospitalizationRepository();
	const budgetRepository = new InmemBudgetRepository();

	const service = new PatientService(
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		budgetRepository,
	);
	return {
		service,
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		budgetRepository,
	};
}
