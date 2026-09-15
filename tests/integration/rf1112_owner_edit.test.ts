import { assert, assertEquals, assertInstanceOf } from "dev_deps";
import { PatientService } from "application/patient_service.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { Role, User } from "domain/auth/user.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

const RECEPTION = "john.doe1234";
const TRAINEE = "john.doe123";

const OWNER_ID = "OWNER-1";

function makeOwner(): Owner {
	return new Owner(OWNER_ID, "Huston", "933843893", true);
}

function makePatient(systemId = "sys-1", ownerId = OWNER_ID): Patient {
	return Patient.restore({
		systemId,
		patientId: "CVL-001",
		name: "Rex",
		specie: "CANINO",
		breed: "bulldog",
		birthDate: "2013-07-01",
		ownerId,
		status: PatientStatus.Discharged,
	});
}

interface Options {
	patientRepository?: InmemPatientRepository;
	ownerRepository?: InmemOwnerRepository;
}

function makeService(options?: Options) {
	const patientRepository = options?.patientRepository ??
		new InmemPatientRepository([makePatient()]);
	const ownerRepository = options?.ownerRepository ?? new InmemOwnerRepository();

	const service = new PatientService(
		patientRepository,
		ownerRepository,
		new InmemHospitalizationRepository(),
		new InmemBudgetRepository(),
		new InmemAlertRepository(),
		new InmemUserRepository([
			new User(RECEPTION, RECEPTION, Role.Reception),
			new User(TRAINEE, TRAINEE, Role.Trainee),
		]),
		new AlertNotifierDummy(),
	);

	return { service, patientRepository, ownerRepository };
}

Deno.test("RF-11/RF-12 - edição global do tutor", async (t) => {
	await t.step("actualiza apenas o nome, telefone e WhatsApp do tutor existente", async () => {
		const ownerRepository = new InmemOwnerRepository();
		await ownerRepository.save(makeOwner());
		const { service } = makeService({ ownerRepository });

		const result = await service.updateOwner(
			"sys-1",
			{ name: "Novo Nome", phoneNumber: "923456789", whatsapp: false },
			RECEPTION,
		);

		assert(result.isRight(), "Deve actualizar o tutor.");
		assertEquals(ownerRepository.records.length, 1, "Não deve duplicar o tutor.");

		const owner = ownerRepository.records[0];
		assertEquals(owner.ownerId.value, OWNER_ID, "O identificador não pode mudar.");
		assertEquals(owner.name, "Novo Nome");
		assertEquals(owner.phoneNumber, "923456789");
		assertEquals(owner.hasWhatsApp(), false);
	});

	await t.step("não cria hospitalização nem altera o paciente ao editar o tutor", async () => {
		const ownerRepository = new InmemOwnerRepository();
		await ownerRepository.save(makeOwner());
		const patientRepository = new InmemPatientRepository([makePatient()]);
		const { service } = makeService({ ownerRepository, patientRepository });

		await service.updateOwner(
			"sys-1",
			{ name: "Outro Nome", phoneNumber: "923456789", whatsapp: true },
			RECEPTION,
		);

		assertEquals(patientRepository.records[0].status, PatientStatus.Discharged);
	});

	await t.step("recusa sem permissão e não altera o tutor", async () => {
		const ownerRepository = new InmemOwnerRepository();
		await ownerRepository.save(makeOwner());
		const { service } = makeService({ ownerRepository });

		const result = await service.updateOwner(
			"sys-1",
			{ name: "Nome Pirata", phoneNumber: "923456789", whatsapp: false },
			TRAINEE,
		);

		assert(result.isLeft(), "Deve recusar.");
		assertInstanceOf(result.value, PermissionDenied);
		assertEquals(ownerRepository.records[0].name, "Huston");
		assertEquals(ownerRepository.records[0].phoneNumber, "933843893");
		assertEquals(ownerRepository.records[0].hasWhatsApp(), true);
	});

	await t.step("devolve @PatientNotFound quando o paciente não existe", async () => {
		const ownerRepository = new InmemOwnerRepository();
		await ownerRepository.save(makeOwner());
		const { service } = makeService({ ownerRepository });

		const result = await service.updateOwner(
			"NAO-EXISTE",
			{ name: "Novo Nome", phoneNumber: "923456789", whatsapp: false },
			RECEPTION,
		);

		assert(result.isLeft(), "Deve devolver erro.");
		assertInstanceOf(result.value, PatientNotFound);
	});

	await t.step("devolve @OwnerNotFound quando o tutor do paciente não existe", async () => {
		const ownerRepository = new InmemOwnerRepository();
		const patientRepository = new InmemPatientRepository([
			makePatient("sys-1", "OWNER-ORFAO"),
		]);
		const { service } = makeService({ ownerRepository, patientRepository });

		const result = await service.updateOwner(
			"sys-1",
			{ name: "Novo Nome", phoneNumber: "923456789", whatsapp: false },
			RECEPTION,
		);

		assert(result.isLeft(), "Deve devolver erro.");
		assertInstanceOf(result.value, OwnerNotFound);
	});
});
