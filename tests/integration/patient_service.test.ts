import { PatientService } from "application/patient_service.ts";
import { assert, assertEquals, assertInstanceOf, assertSpyCalls, spy } from "dev_deps";
import { Budget, BudgetStatus } from "domain/budget/budget.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { InvalidDate } from "domain/hospitalization/invalid_date_error.ts";
import { InvalidNumber } from "domain/hospitalization/invalid_number_error.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientAlreadyHospitalized } from "domain/patient/patient_already_hospitalized_error.ts";
import { PatientIdAlreadyExists } from "domain/patient/patient_id_already_exists_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { ID } from "shared/id.ts";
import {
	hospitalizationData,
	invalidComplaints,
	invalidDiagnostics,
	newPatientData,
	PATIENTS,
} from "../fake_data.ts";
import { BudgetRepositoryStub } from "../stubs/budget_repository_stub.ts";
import { HospitalizationRepositoryStub } from "../stubs/hospitalization_repository_stub.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";
import { AlertRepository } from "domain/hospitalization/alerts/alert_repository.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { RepeatEvery } from "domain/hospitalization/alerts/repeat_every.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";
import { AlertNotifier } from "application/alert_notifier.ts";

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

		assert(patients.length >= 1);
	});
});

Deno.test("Patient Service - New Hospitalization", async (t) => {
	const patientId = PATIENTS.discharged["1923BA"].id;

	await t.step("Deve abrir uma nova hospitalização", async () => {
		const { service, patientRepository, hospitalizationRepository } = makeService();

		await service.newHospitalization(patientId, hospitalizationData);

		const patientOrErr = await patientRepository.getById(ID.fromString(patientId));
		const patient = <Patient> patientOrErr.value;

		const hospitalizationOrErr = await hospitalizationRepository.getByPatientId(
			patient.systemId,
		);

		const hospitalization = <Hospitalization> hospitalizationOrErr.value;

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
				patientId,
				hospitalizationData,
			);
			assertInstanceOf(error.value, PatientAlreadyHospitalized);
		},
	);

	await t.step(
		"Deve retornar @InvalidNumber se o número de queixas for maior que 10",
		async () => {
			const { service } = makeService();

			const error = await service.newHospitalization(
				"1918BA",
				{ ...hospitalizationData, complaints: invalidComplaints },
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step(
		"Deve retornar @InvalidNumber se o número de diagnosticos for maior que 5",
		async () => {
			const { service } = makeService();

			const error = await service.newHospitalization(
				"1918BA",
				{ ...hospitalizationData, diagnostics: invalidDiagnostics },
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidNumber);
		},
	);

	await t.step(
		"Deve retornar @InvalidDate se a data de alta médica for inferior a data actual",
		async () => {
			const entryDate = new Date().getTime() + 1000 * 60 * 60 * 24;

			const { service } = makeService();

			const error = await service.newHospitalization(
				"1918BA",
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
			whatsapp: true,
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
			whatsapp: true,
		};

		await service.newPatient({ ...newPatientData, ownerData });

		const patient = await patientRepository.last();

		assertEquals(patient.ownerId.value, ownerData.ownerId);
	});

	await t.step("Deve registrar o paciente com o ID de um proprietário existente.", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service, ownerRepository } = makeService({ patientRepository });
		const owner = new Owner("1956B", "John", "933001122", true);

		await ownerRepository.save(owner);

		await service.newPatient({
			...newPatientData,
			ownerData: {
				ownerId: "1956B",
				name: "John",
				phoneNumber: "933001122",
				whatsapp: true,
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

	await t.step("Deve marcar se o tutor tem WhatsApp", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service, ownerRepository } = makeService({ patientRepository });
		const ownerData = {
			ownerId: "1956B",
			name: "John",
			phoneNumber: "933001122",
			whatsapp: true,
		};

		const data = { ...newPatientData, ownerData: ownerData };

		await service.newPatient(data);

		const ownerOrErr = await ownerRepository.getById(ID.fromString("1956B"));
		const owner = <Owner> ownerOrErr.value;

		assertEquals(owner.hasWhatsApp(), true);
	});

	await t.step("Deve marcar se o tutor não tem WhatsApp", async () => {
		const patientRepository = new InmemPatientRepository();
		const { service, ownerRepository } = makeService({ patientRepository });
		const ownerData = {
			ownerId: "1956B",
			name: "John",
			phoneNumber: "933001122",
			whatsapp: false,
		};

		const data = { ...newPatientData, ownerData: ownerData };

		await service.newPatient(data);

		const ownerOrErr = await ownerRepository.getById(ID.fromString("1956B"));
		const owner = <Owner> ownerOrErr.value;

		assertEquals(owner.hasWhatsApp(), false);
	});
});

Deno.test("Patient Service - End Hospitalization", async (t) => {
	await t.step("Deve encerrar a hospitalização", async () => {
		const hospitalizationRepository = new HospitalizationRepositoryStub();
		const budgetRepository = new BudgetRepositoryStub();

		const { service } = makeService({ hospitalizationRepository, budgetRepository });

		await service.endHospitalization("1918BA");

		const error = await hospitalizationRepository.getByPatientId(ID.fromString("1918BA"));

		assertEquals(error.isLeft(), true);
	});

	await t.step("Deve dar a alta no paciente ao encerrar a hospitalização", async () => {
		const hospitalizationRepository = new HospitalizationRepositoryStub();
		const budgetRepository = new BudgetRepositoryStub();

		const { service, patientRepository } = makeService({
			hospitalizationRepository,
			budgetRepository,
		});

		await service.endHospitalization("1922BA");

		const patientOrErr = await patientRepository.getById(ID.fromString("1922BA"));

		const patient = <Patient> patientOrErr.value;

		assertEquals(patient.status, PatientStatus.Discharged);
	});

	await t.step(
		"Se o Orçamento não foi pago, dever dar alta com o estado **ALTA_MEDICA_E_ORCAMENTO_NÃO_PAGO**",
		async () => {
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const budgetRepository = new BudgetRepositoryStub();

			const { service, patientRepository } = makeService({
				hospitalizationRepository,
				budgetRepository,
			});

			await service.endHospitalization("1919BA");

			const patientOrErr = await patientRepository.getById(ID.fromString("1919BA"));

			const patient = <Patient> patientOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithUnpaidBudget);
		},
	);

	await t.step(
		"Se o orçamento está pendente, deve dar alta com o estado **ALTA_MEDICA_E_ORCAMENTO_PENDENTE**",
		async () => {
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const budgetRepository = new BudgetRepositoryStub();
			const { service, patientRepository } = makeService({
				hospitalizationRepository,
				budgetRepository,
			});

			await service.endHospitalization("1920BA");

			const patientOrErr = await patientRepository.getById(ID.fromString("1920BA"));

			const patient = <Patient> patientOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithPendingBudget);
		},
	);

	await t.step(
		"Se o orçamento está pendente com orçamento envido, deve dar alta com o estado **ALTA_MEDICA_E_ORCAMENTO_ENVIADO**",
		async () => {
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const budgetRepository = new BudgetRepositoryStub();

			const { service, patientRepository } = makeService({
				hospitalizationRepository,
				budgetRepository,
			});

			await service.endHospitalization("1921BA");

			const patientOrErr = await patientRepository.getById(ID.fromString("1921BA"));

			const patient = <Patient> patientOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithBudgetSent);
		},
	);

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não foi encontrado",
		async () => {
			const { service } = makeService();

			const error = await service.endHospitalization("1781GD");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);

	await t.step(
		"Deve retornar @HospitalizationAlreadyClosed, se a hospitalização já foi encerrada",
		async () => {
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const { service } = makeService({ hospitalizationRepository });

			const error = await service.endHospitalization("1918BA");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, HospitalizationNotFound);
		},
	);

	await t.step("Deve cancelar os alertas quando a hospitalização é encerrada", async () => {
		const hospitalizationRepository = new HospitalizationRepositoryStub();
		const alertRepository = new InmemAlertRepository();
		await alertRepository.save(alert1);
		await alertRepository.save(alert2);
		const budgetRepository = new BudgetRepositoryStub();
		const { service } = makeService({
			hospitalizationRepository,
			budgetRepository,
			alertRepository,
		});

		await service.endHospitalization("1901BA");

		const alerts = await alertRepository.findAll(ID.fromString("1901BA"));

		assertEquals(alerts.length, 2);
		alerts.every((a) => assert(a.isDisabled() === true));
	});

	await t.step(
		"Deve notificar o worker para remover os jobs para os alertas do paciente",
		async () => {
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const alertRepository = new InmemAlertRepository();
			await alertRepository.save(alert1);
			await alertRepository.save(alert3);
			const budgetRepository = new BudgetRepositoryStub();
			const { service, alertNotifier } = makeService({
				hospitalizationRepository,
				budgetRepository,
				alertRepository,
				alertNotifier: new AlertNotifierDummy(),
			});
			const alertSpy = spy(alertNotifier, "cancel");

			await service.endHospitalization("1902BA");

			assertSpyCalls(alertSpy, 1);
		},
	);
});

Deno.test("Patient Service - End Budget", async (t) => {
	await t.step("Deve dar alta médica ao paciente se o orçamento for pago", async () => {
		const budgetRepository = new BudgetRepositoryStub();
		const hospitalizationRepository = new HospitalizationRepositoryStub();
		const { service, patientRepository } = makeService({
			budgetRepository,
			hospitalizationRepository,
		});
		const patientId = "1924BA";
		const hospitalizationId = "0006";
		const status = "PAGO";

		await service.endBudget(patientId, hospitalizationId, status);

		const patientOrErr = await patientRepository.getById(ID.fromString(patientId));
		const patient = <Patient> patientOrErr.value;

		const budgetOrErr = await budgetRepository.get(
			ID.fromString(hospitalizationId),
		);

		const budget = <Budget> budgetOrErr.value;

		assertEquals(patient.status, PatientStatus.Discharged);
		assertEquals(budget.status, BudgetStatus.Paid);
	});

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não foi encontrado",
		async () => {
			const { service } = makeService();
			const patientId = "20000";

			const error = await service.endBudget(patientId, "0001", "PAGO");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);

	await t.step(
		"Não deve actualizar o estado do paciente se ele já recebeu alta",
		async () => {
			const { service, patientRepository } = makeService();
			const repoSpy = spy(patientRepository, "update");
			const patientId = "1925BA";

			await service.endBudget(patientId, "0001", "PAGO");

			assertSpyCalls(repoSpy, 0);
		},
	);

	await t.step(
		"Não deve actualizar o estado do orçamento se o paciente já recebeu alta",
		async () => {
			const { service, budgetRepository } = makeService();
			const repoSpy = spy(budgetRepository, "update");
			const patientId = "1925BA";

			await service.endBudget(patientId, "0001", "PAGO");

			assertSpyCalls(repoSpy, 0);
		},
	);

	await t.step(
		"Se o orçamento não foi pago, deve dar alta com o estado **ALTA_MEDICA_E_ORCAMENTO_NÃO_PAGO**",
		async () => {
			const budgetRepository = new BudgetRepositoryStub();
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const { service, patientRepository } = makeService({
				budgetRepository,
				hospitalizationRepository,
			});
			const patientId = "1926BA";
			const hospitalizationId = "0006";
			const status = "NÃO PAGO";

			await service.endBudget(patientId, hospitalizationId, status);

			const patientOrErr = await patientRepository.getById(ID.fromString(patientId));
			const patient = <Patient> patientOrErr.value;

			const budgetOrErr = await budgetRepository.get(
				ID.fromString(hospitalizationId),
			);

			const budget = <Budget> budgetOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithUnpaidBudget);
			assertEquals(budget.status, BudgetStatus.UnPaid);
		},
	);

	await t.step(
		"Se o orçamento está pendente, deve dar alta com o estado **ALTA_MEDICA_E_ORCAMENTO_PENDENTE**",
		async () => {
			const budgetRepository = new BudgetRepositoryStub();
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const { service, patientRepository } = makeService({
				budgetRepository,
				hospitalizationRepository,
			});
			const patientId = "1927BA";
			const hospitalizationId = "0006";
			const status = "PENDENTE";

			await service.endBudget(patientId, hospitalizationId, status);

			const patientOrErr = await patientRepository.getById(ID.fromString(patientId));
			const patient = <Patient> patientOrErr.value;

			const budgetOrErr = await budgetRepository.get(
				ID.fromString(hospitalizationId),
			);

			const budget = <Budget> budgetOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithPendingBudget);
			assertEquals(budget.status, BudgetStatus.Pending);
		},
	);

	await t.step(
		"Se o orçamento está pendente com orçamento envido, deve dar alta com o estado **ALTA_MEDICA_E_ORCAMENTO_ENVIADO**",
		async () => {
			const budgetRepository = new BudgetRepositoryStub();
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const { service, patientRepository } = makeService({
				budgetRepository,
				hospitalizationRepository,
			});
			const patientId = "1928BA";
			const hospitalizationId = "0006";
			const status = "PENDENTE (ORÇAMENTO ENVIADO)";

			await service.endBudget(patientId, hospitalizationId, status);

			const patientOrErr = await patientRepository.getById(ID.fromString(patientId));
			const patient = <Patient> patientOrErr.value;

			const budgetOrErr = await budgetRepository.get(
				ID.fromString(hospitalizationId),
			);

			const budget = <Budget> budgetOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithBudgetSent);
			assertEquals(budget.status, BudgetStatus.PendingWithBudgetSent);
		},
	);
});

const alert1 = new Alert(
	ID.random(),
	ID.fromString("1901BA"),
	["1"],
	new Date(),
	new RepeatEvery(1),
	"comments",
);

const alert2 = new Alert(
	ID.random(),
	ID.fromString("1901BA"),
	["2"],
	new Date(),
	new RepeatEvery(1),
	"comments",
);

const alert3 = new Alert(
	ID.random(),
	ID.fromString("1902BA"),
	["3"],
	new Date(),
	new RepeatEvery(1),
	"Comments",
);

interface Options {
	patientRepository?: PatientRepository;
	ownerRepository?: OwnerRepository;
	hospitalizationRepository?: HospitalizationRepository;
	budgetRepository?: BudgetRepository;
	alertRepository?: AlertRepository;
	alertNotifier?: AlertNotifier;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ?? new PatientRepositoryStub();
	const ownerRepository = options?.ownerRepository ?? new InmemOwnerRepository();
	const hospitalizationRepository = options?.hospitalizationRepository ??
		new InmemHospitalizationRepository();
	const budgetRepository = options?.budgetRepository ?? new InmemBudgetRepository();
	const alertRepository = options?.alertRepository ?? new InmemAlertRepository();
	const alertNotifier = options?.alertNotifier ?? new AlertNotifierDummy();

	const service = new PatientService(
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		budgetRepository,
		alertRepository,
		alertNotifier,
	);
	return {
		service,
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		budgetRepository,
		alertRepository,
		alertNotifier,
	};
}
