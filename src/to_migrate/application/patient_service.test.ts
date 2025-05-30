import { assert, assertEquals, assertInstanceOf } from "@deps/assert";
import { assertSpyCalls, spy } from "@deps/mock";
import { PermissionDenied } from "@domain/auth/permission_denied_error.ts";
import { Role, User } from "@domain/auth/user.ts";
import { Budget, BudgetStatus } from "@domain/budget/budget.ts";
import { BudgetRepository } from "@domain/budget/budget_repository.ts";
import { OwnerRepository } from "@domain/crm/owner/owner_repository.ts";
import { Alert } from "@domain/hospitalization/alerts/alert.ts";
import { AlertRepository } from "@domain/hospitalization/alerts/alert_repository.ts";
import { RepeatEvery } from "@domain/hospitalization/alerts/repeat_every.ts";
import { HospitalizationNotFound } from "@domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "@domain/hospitalization/hospitalization_repository.ts";
import { Patient, PatientStatus } from "@domain/patient/patient.ts";
import { PatientNotFound } from "@domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "@domain/patient/patient_repository.ts";
import { InmemAlertRepository } from "@infra/persistence/inmem/inmem_alert_repository.ts";
import { InmemBudgetRepository } from "@infra/persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "@infra/persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "@infra/persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "@infra/persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "@infra/persistence/inmem/inmem_user_repository.ts";
import { ID } from "@shared/id.ts";
import { AlertNotifierDummy } from "@testDoubles/alert_notifier_dummy.ts";
import { BudgetRepositoryStub } from "@testDoubles/budget_repository_stub.ts";
import { HospitalizationRepositoryStub } from "@testDoubles/hospitalization_repository_stub.ts";
import { PatientRepositoryStub } from "@testDoubles/patient_repository_stub.ts";
import { AlertNotifier } from "@application/alert_notifier.ts";
import { PatientService } from "@application/patient_service.ts";

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

Deno.test("Patient Service - End Hospitalization", async (t) => {
	await t.step("Deve encerrar a hospitalização", async () => {
		const hospitalizationRepository = new HospitalizationRepositoryStub();
		const budgetRepository = new BudgetRepositoryStub();

		const { service } = makeService({ hospitalizationRepository, budgetRepository });

		await service.endHospitalization("1918BA", "john.doe1234");

		const error = await hospitalizationRepository.findByPatientId(ID.fromString("1918BA"));

		assertEquals(error.isLeft(), true);
	});

	await t.step("Deve dar a alta no paciente ao encerrar a hospitalização", async () => {
		const hospitalizationRepository = new HospitalizationRepositoryStub();
		const budgetRepository = new BudgetRepositoryStub();

		const { service, patientRepository } = makeService({
			hospitalizationRepository,
			budgetRepository,
		});

		await service.endHospitalization("1922BA", "john.doe1234");

		const patientOrErr = await patientRepository.findBySystemId(ID.fromString("1922BA"));

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

			await service.endHospitalization("1919BA", "john.doe1234");

			const patientOrErr = await patientRepository.findBySystemId(ID.fromString("1919BA"));

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

			await service.endHospitalization("1920BA", "john.doe1234");

			const patientOrErr = await patientRepository.findBySystemId(ID.fromString("1920BA"));

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

			await service.endHospitalization("1921BA", "john.doe1234");

			const patientOrErr = await patientRepository.findBySystemId(ID.fromString("1921BA"));

			const patient = <Patient> patientOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithBudgetSent);
		},
	);

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não foi encontrado",
		async () => {
			const { service } = makeService();

			const error = await service.endHospitalization("1781GD", "john.doe1234");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);

	await t.step(
		"Deve retornar @HospitalizationAlreadyClosed, se a hospitalização já foi encerrada",
		async () => {
			const hospitalizationRepository = new HospitalizationRepositoryStub();
			const { service } = makeService({ hospitalizationRepository });

			const error = await service.endHospitalization("1918BA", "john.doe1234");

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

		await service.endHospitalization("1901BA", "john.doe1234");

		const alerts = await alertRepository.findByPatientId(ID.fromString("1901BA"));

		assertEquals(alerts.length, 2);
		alerts.every((a) => assert(a.isCanceled() === true));
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

			await service.endHospitalization("1902BA", "john.doe1234");

			assertSpyCalls(alertSpy, 1);
		},
	);

	await t.step(
		"Deve retornar @PermissionDenied se o utilizador não tiver permissão para encerrar a hospitalização",
		async () => {
			const { service } = makeService();

			const error = await service.endHospitalization("1918BA", "john.doe123");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PermissionDenied);
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

		await service.endBudget(patientId, hospitalizationId, status, "john.doe1234");

		const patientOrErr = await patientRepository.findBySystemId(ID.fromString(patientId));
		const patient = <Patient> patientOrErr.value;

		const budgetOrErr = await budgetRepository.findByHospitalizationId(
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

			const error = await service.endBudget(patientId, "0001", "PAGO", "john.doe1234");

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

			await service.endBudget(patientId, "0001", "PAGO", "john.doe1234");

			assertSpyCalls(repoSpy, 0);
		},
	);

	await t.step(
		"Não deve actualizar o estado do orçamento se o paciente já recebeu alta",
		async () => {
			const { service, budgetRepository } = makeService();
			const repoSpy = spy(budgetRepository, "update");
			const patientId = "1925BA";

			await service.endBudget(patientId, "0001", "PAGO", "john.doe1234");

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

			await service.endBudget(patientId, hospitalizationId, status, "john.doe1234");

			const patientOrErr = await patientRepository.findBySystemId(ID.fromString(patientId));
			const patient = <Patient> patientOrErr.value;

			const budgetOrErr = await budgetRepository.findByHospitalizationId(
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

			await service.endBudget(patientId, hospitalizationId, status, "john.doe1234");

			const patientOrErr = await patientRepository.findBySystemId(ID.fromString(patientId));
			const patient = <Patient> patientOrErr.value;

			const budgetOrErr = await budgetRepository.findByHospitalizationId(
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

			await service.endBudget(patientId, hospitalizationId, status, "john.doe1234");

			const patientOrErr = await patientRepository.findBySystemId(ID.fromString(patientId));
			const patient = <Patient> patientOrErr.value;

			const budgetOrErr = await budgetRepository.findByHospitalizationId(
				ID.fromString(hospitalizationId),
			);

			const budget = <Budget> budgetOrErr.value;

			assertEquals(patient.status, PatientStatus.DischargedWithBudgetSent);
			assertEquals(budget.status, BudgetStatus.PendingWithBudgetSent);
		},
	);

	await t.step(
		"Deve retornar @PermissionDenied se o utilizador não tiver permissão para encerrar o orçamento",
		async () => {
			const { service } = makeService();

			const error = await service.endBudget("1928BA", "0045", "NÃO PAGO", "john.doe123");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PermissionDenied);
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
	const user1 = new User("john.doe123", "john.doe123", Role.Trainee);
	const user2 = new User("john.doe1234", "john.doe1234", Role.Reception);
	const userRepository = new InmemUserRepository([user1, user2]);

	const service = new PatientService(
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		budgetRepository,
		alertRepository,
		userRepository,
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
