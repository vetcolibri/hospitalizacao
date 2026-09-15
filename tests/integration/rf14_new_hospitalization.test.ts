import {
	assert,
	assertEquals,
	assertInstanceOf,
	assertRejects,
	assertSpyCalls,
	spy,
} from "dev_deps";
import { PatientService } from "application/patient_service.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { PatientStatus } from "domain/patient/patient.ts";
import { Patient } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientAlreadyHospitalized } from "domain/patient/patient_already_hospitalized_error.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { Role, User } from "domain/auth/user.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

const RECEPTION = "john.doe1234";
const TRAINEE = "john.doe123";
const ADMIN = "admin.user";

const OWNER = new Owner("OWNER-1", "Huston", "933843893", true);

const HOSPITALIZATION_DATA = {
	weight: 16.5,
	entryDate: "2021-01-01",
	complaints: ["Queixa 1", "Queixa 2"],
	diagnostics: ["Diagnostico 1"],
};

const BUDGET_DATA = {
	startOn: "2021-01-01T00:00:00.000Z",
	endOn: "2021-01-10T00:00:00.000Z",
	status: "NÃO PAGO",
};

const DISCHARGE_STATUSES = [
	PatientStatus.Discharged,
	PatientStatus.DischargedWithUnpaidBudget,
	PatientStatus.DischargedWithPendingBudget,
	PatientStatus.DischargedWithBudgetSent,
];

function makePatient(systemId: string, clinicId: string, status: PatientStatus): Patient {
	return Patient.restore({
		systemId,
		patientId: clinicId,
		name: "Rex",
		specie: "CANINO",
		breed: "bulldog",
		birthDate: "2013-07-01",
		ownerId: OWNER.ownerId.value,
		status,
	});
}

Deno.test("RF-14 - Pesquisa de paciente existente", async (t) => {
	await t.step(
		"Pesquisa autorizada devolve o paciente pelo ID da clínica sem carregar a lista completa",
		async () => {
			const patientRepository = new InmemPatientRepository([
				makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
			]);
			const { service } = makeService({ patientRepository });
			const byIdSpy = spy(patientRepository, "findByPatientId");
			const byStatusSpy = spy(patientRepository, "findByStatus");

			const result = await service.searchPatient("CVL-001", RECEPTION);

			assert(result.isRight(), "Deve encontrar o paciente.");
			assertEquals(result.value.systemId.value, "sys-1");
			assertEquals(result.value.patientId.value, "CVL-001");
			assertSpyCalls(byIdSpy, 1);
			assertSpyCalls(byStatusSpy, 0);
		},
	);

	await t.step("Pesquisa sem permissão é recusada", async () => {
		const patientRepository = new InmemPatientRepository([
			makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
		]);
		const { service } = makeService({ patientRepository });

		const result = await service.searchPatient("CVL-001", TRAINEE);

		assert(result.isLeft(), "Deve recusar a pesquisa.");
		assertInstanceOf(result.value, PermissionDenied);
	});

	await t.step("Pesquisa de paciente inexistente devolve @PatientNotFound", async () => {
		const { service } = makeService();

		const result = await service.searchPatient("NAO-EXISTE", RECEPTION);

		assert(result.isLeft(), "Deve devolver um erro.");
		assertInstanceOf(result.value, PatientNotFound);
	});
});

Deno.test("RF-14 - Estados de alta", async (t) => {
	await t.step("A lista de não hospitalizados inclui os quatro estados de alta", async () => {
		const patients = DISCHARGE_STATUSES.map((status, index) =>
			makePatient(`sys-${index}`, `CVL-00${index}`, status)
		);
		patients.push(makePatient("sys-hosp", "CVL-HOSP", PatientStatus.Hospitalized));
		const patientRepository = new InmemPatientRepository(patients);
		const { service } = makeService({ patientRepository });

		const nonHospitalized = await service.listNonHospitalized();

		assertEquals(nonHospitalized.length, 4, "Deve devolver os quatro estados de alta.");
		assertEquals(
			nonHospitalized.map((p) => p.status).sort(),
			[...DISCHARGE_STATUSES].sort(),
		);
	});

	await t.step("Todos os estados de alta permitem abrir uma nova hospitalização", async () => {
		const patients = DISCHARGE_STATUSES.map((status, index) =>
			makePatient(`sys-${index}`, `CVL-00${index}`, status)
		);

		for (const patient of patients) {
			const patientRepository = new InmemPatientRepository([patient]);
			const hospitalizationRepository = new InmemHospitalizationRepository();
			const { service } = makeService({ patientRepository, hospitalizationRepository });

			const result = await service.newHospitalization(
				patient.systemId.value,
				HOSPITALIZATION_DATA,
				BUDGET_DATA,
				RECEPTION,
			);

			assert(
				result.isRight(),
				`Deve hospitalizar novamente o paciente com estado ${patient.status}`,
			);
			assertEquals(
				hospitalizationRepository.records.length,
				1,
				"A hospitalização deve ter sido registada.",
			);
		}
	});
});

Deno.test("RF-14 - Reutiliza o paciente sem duplicar ficha nem tutor", async (t) => {
	await t.step(
		"A nova hospitalização cria hospitalização e orçamento sem duplicar paciente nem tutor",
		async () => {
			const patientRepository = new InmemPatientRepository([
				makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
			]);
			const ownerRepository = new InmemOwnerRepository();
			await ownerRepository.save(OWNER);
			const hospitalizationRepository = new InmemHospitalizationRepository();
			const budgetRepository = new InmemBudgetRepository();
			const { service } = makeService({
				patientRepository,
				ownerRepository,
				hospitalizationRepository,
				budgetRepository,
			});

			const result = await service.newHospitalization(
				"sys-1",
				HOSPITALIZATION_DATA,
				BUDGET_DATA,
				RECEPTION,
			);

			assert(result.isRight(), "Deve hospitalizar o paciente existente.");
			assertEquals(patientRepository.records.length, 1, "Não deve duplicar o paciente.");
			assertEquals(ownerRepository.records.length, 1, "Não deve duplicar o tutor.");

			assertEquals(hospitalizationRepository.records.length, 1);
			assertEquals(budgetRepository.records.length, 1, "Deve criar o orçamento.");

			const hospitalization = hospitalizationRepository.records[0];
			const budget = budgetRepository.records[0];
			assertEquals(
				budget.hospitalizationId.value,
				hospitalization.hospitalizationId.value,
				"O orçamento deve pertencer à nova hospitalização.",
			);

			const patient = patientRepository.records[0];
			assertEquals(patient.status, PatientStatus.Hospitalized);

			const owner = (await ownerRepository.getById(OWNER.ownerId)).value as Owner;
			assertEquals(owner.name, OWNER.name);
			assertEquals(owner.phoneNumber, OWNER.phoneNumber);
			assertEquals(owner.hasWhatsApp(), OWNER.hasWhatsApp());
		},
	);

	await t.step("Não deve editar o tutor ao hospitalizar um paciente existente", async () => {
		const patientRepository = new InmemPatientRepository([
			makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
		]);
		const ownerRepository = new InmemOwnerRepository();
		await ownerRepository.save(OWNER);
		const { service } = makeService({ patientRepository, ownerRepository });
		const ownerSaveSpy = spy(ownerRepository, "save");

		await service.newHospitalization(
			"sys-1",
			HOSPITALIZATION_DATA,
			BUDGET_DATA,
			RECEPTION,
		);

		assertSpyCalls(ownerSaveSpy, 0);
	});
});

Deno.test("RF-14 - Recusa segunda hospitalização activa", async (t) => {
	await t.step(
		"Recusa quando existe uma hospitalização aberta sem escolher o episódio ao acaso",
		async () => {
			// O estado do paciente ficou dessincronizado, mas existe uma hospitalização aberta.
			const patient = makePatient("sys-1", "CVL-001", PatientStatus.Discharged);
			const patientRepository = new InmemPatientRepository([patient]);
			const hospitalizationRepository = new InmemHospitalizationRepository([
				new Hospitalization(ID.fromString("hosp-1"), "sys-1", 10, ["a"], ["b"], "2021-01-01"),
			]);
			const { service } = makeService({ patientRepository, hospitalizationRepository });

			const result = await service.newHospitalization(
				"sys-1",
				HOSPITALIZATION_DATA,
				BUDGET_DATA,
				RECEPTION,
			);

			assert(result.isLeft(), "Deve recusar a segunda hospitalização activa.");
			assertInstanceOf(result.value, PatientAlreadyHospitalized);
			assertEquals(
				hospitalizationRepository.records.length,
				1,
				"Não deve criar uma hospitalização adicional.",
			);
			assertEquals(patientRepository.records[0].status, PatientStatus.Discharged);
		},
	);

	await t.step(
		"Recusa com múltiplas hospitalizações abertas sem escolher nenhuma delas",
		async () => {
			const patientRepository = new InmemPatientRepository([
				makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
			]);
			const hospitalizationRepository = new InmemHospitalizationRepository([
				new Hospitalization(ID.fromString("hosp-1"), "sys-1", 10, ["a"], ["b"], "2021-01-01"),
				new Hospitalization(ID.fromString("hosp-2"), "sys-1", 11, ["a"], ["b"], "2021-02-01"),
			]);
			const { service } = makeService({ patientRepository, hospitalizationRepository });

			const result = await service.newHospitalization(
				"sys-1",
				HOSPITALIZATION_DATA,
				BUDGET_DATA,
				RECEPTION,
			);

			assert(result.isLeft(), "Deve recusar.");
			assertInstanceOf(result.value, PatientAlreadyHospitalized);
			assertEquals(hospitalizationRepository.records.length, 2);
		},
	);

	await t.step("Recusa quando o paciente está marcado como hospitalizado", async () => {
		const patientRepository = new InmemPatientRepository([
			makePatient("sys-1", "CVL-001", PatientStatus.Hospitalized),
		]);
		const { service } = makeService({ patientRepository });

		const result = await service.newHospitalization(
			"sys-1",
			HOSPITALIZATION_DATA,
			BUDGET_DATA,
			RECEPTION,
		);

		assert(result.isLeft(), "Deve recusar.");
		assertInstanceOf(result.value, PatientAlreadyHospitalized);
	});

	await t.step("Recusa a hospitalização sem permissão do utilizador", async () => {
		const patientRepository = new InmemPatientRepository([
			makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
		]);
		const hospitalizationRepository = new InmemHospitalizationRepository();
		const { service } = makeService({ patientRepository, hospitalizationRepository });

		const result = await service.newHospitalization(
			"sys-1",
			HOSPITALIZATION_DATA,
			BUDGET_DATA,
			TRAINEE,
		);

		assert(result.isLeft(), "Deve recusar.");
		assertInstanceOf(result.value, PermissionDenied);
		assertEquals(hospitalizationRepository.records.length, 0);
	});
});

Deno.test("RF-14 - Hospitalização e orçamento atómicos", async (t) => {
	await t.step(
		"Orçamento inválido não persiste hospitalização, orçamento nem altera o paciente",
		async () => {
			const patientRepository = new InmemPatientRepository([
				makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
			]);
			const hospitalizationRepository = new InmemHospitalizationRepository();
			const budgetRepository = new InmemBudgetRepository();
			const { service } = makeService({
				patientRepository,
				hospitalizationRepository,
				budgetRepository,
			});

			const result = await service.newHospitalization(
				"sys-1",
				HOSPITALIZATION_DATA,
				{ startOn: "", endOn: "", status: "NÃO PAGO" },
				RECEPTION,
			);

			assert(result.isLeft(), "Deve devolver erro antes de guardar.");
			assertEquals(hospitalizationRepository.records.length, 0);
			assertEquals(budgetRepository.records.length, 0);
			assertEquals(patientRepository.records[0].status, PatientStatus.Discharged);
		},
	);

	await t.step(
		"Falha ao guardar o orçamento não marca o paciente como hospitalizado",
		async () => {
			const patientRepository = new InmemPatientRepository([
				makePatient("sys-1", "CVL-001", PatientStatus.Discharged),
			]);
			const hospitalizationRepository = new InmemHospitalizationRepository();
			const budgetRepository = new FailingBudgetRepository();
			const { service } = makeService({
				patientRepository,
				hospitalizationRepository,
				budgetRepository,
			});

			await assertRejects(() =>
				service.newHospitalization(
					"sys-1",
					HOSPITALIZATION_DATA,
					BUDGET_DATA,
					RECEPTION,
				)
			);

			assertEquals(patientRepository.records[0].status, PatientStatus.Discharged);
			assertEquals(budgetRepository.records.length, 0);
		},
	);
});

class FailingBudgetRepository extends InmemBudgetRepository {
	override save(): Promise<void> {
		return Promise.reject(new Error("falha ao guardar orçamento"));
	}
}

interface Options {
	patientRepository?: InmemPatientRepository;
	ownerRepository?: InmemOwnerRepository;
	hospitalizationRepository?: InmemHospitalizationRepository;
	budgetRepository?: InmemBudgetRepository;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ?? new InmemPatientRepository();
	const ownerRepository = options?.ownerRepository ?? new InmemOwnerRepository();
	const hospitalizationRepository = options?.hospitalizationRepository ??
		new InmemHospitalizationRepository();
	const budgetRepository = options?.budgetRepository ?? new InmemBudgetRepository();

	const service = new PatientService(
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		budgetRepository,
		new InmemAlertRepository(),
		new InmemUserRepository([
			new User(RECEPTION, RECEPTION, Role.Reception),
			new User(TRAINEE, TRAINEE, Role.Trainee),
			new User(ADMIN, ADMIN, Role.Admin),
		]),
		new AlertNotifierDummy(),
	);

	return {
		service,
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		budgetRepository,
	};
}
