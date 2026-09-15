import { assert, assertEquals } from "dev_deps";
import { PatientService } from "application/patient_service.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { Role, User } from "domain/auth/user.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * RF-13 — abrir uma hospitalização com (ou sem) contacto específico não altera o
 * tutor principal e nunca mistura contacto de outro episódio.
 */

const RECEPTION = "john.doe1234";
const OWNER_ID = "OWNER-1";

const OWNER = new Owner(OWNER_ID, "Huston", "933843893", true);

const HOSPITALIZATION_DATA = {
	weight: 16.5,
	entryDate: "2021-01-01",
	complaints: ["Queixa 1"],
	diagnostics: ["Diagnostico 1"],
};

const BUDGET_DATA = {
	startOn: "2021-01-01T00:00:00.000Z",
	endOn: "2021-01-10T00:00:00.000Z",
	status: "NÃO PAGO",
};

const CONTACT = { name: "Maria José", phoneNumber: "923456789", whatsapp: true };

function makePatient(systemId = "sys-1", status = PatientStatus.Discharged): Patient {
	return Patient.restore({
		systemId,
		patientId: `CVL-${systemId}`,
		name: "Rex",
		specie: "CANINO",
		breed: "bulldog",
		birthDate: "2013-07-01",
		ownerId: OWNER_ID,
		status,
	});
}

async function makeService() {
	const patientRepository = new InmemPatientRepository([makePatient()]);
	const ownerRepository = new InmemOwnerRepository();
	await ownerRepository.save(OWNER);
	const hospitalizationRepository = new InmemHospitalizationRepository();

	const service = new PatientService(
		patientRepository,
		ownerRepository,
		hospitalizationRepository,
		new InmemBudgetRepository(),
		new InmemAlertRepository(),
		new InmemUserRepository([new User(RECEPTION, RECEPTION, Role.Reception)]),
		new AlertNotifierDummy(),
	);

	return { service, ownerRepository, hospitalizationRepository };
}

Deno.test("RF-13 - contacto específico por hospitalização", async (t) => {
	await t.step(
		"com excepção guarda o contacto no episódio sem tocar no tutor",
		async () => {
			const { service, ownerRepository, hospitalizationRepository } = await makeService();

			const result = await service.newHospitalization(
				"sys-1",
				{ ...HOSPITALIZATION_DATA, contact: CONTACT },
				BUDGET_DATA,
				RECEPTION,
			);

			assert(result.isRight(), "Deve hospitalizar.");
			assertEquals(hospitalizationRepository.records.length, 1);

			const hospitalization = hospitalizationRepository.records[0];
			assertEquals(hospitalization.contact?.name, CONTACT.name);
			assertEquals(hospitalization.contact?.phoneNumber, CONTACT.phoneNumber);
			assertEquals(hospitalization.contact?.whatsapp, CONTACT.whatsapp);

			const owner = ownerRepository.records[0];
			assertEquals(owner.name, OWNER.name, "O tutor não pode ser alterado.");
			assertEquals(owner.phoneNumber, OWNER.phoneNumber);
			assertEquals(owner.hasWhatsApp(), true);
		},
	);

	await t.step("sem excepção o episódio não guarda contacto próprio", async () => {
		const { service, hospitalizationRepository } = await makeService();

		const result = await service.newHospitalization(
			"sys-1",
			HOSPITALIZATION_DATA,
			BUDGET_DATA,
			RECEPTION,
		);

		assert(result.isRight());
		assertEquals(hospitalizationRepository.records[0].contact, undefined);
	});

	await t.step("um contacto inválido não deixa gravação parcial", async () => {
		const { service, hospitalizationRepository, ownerRepository } = await makeService();

		const result = await service.newHospitalization(
			"sys-1",
			{ ...HOSPITALIZATION_DATA, contact: { ...CONTACT, phoneNumber: "12345" } },
			BUDGET_DATA,
			RECEPTION,
		);

		assert(result.isLeft(), "Deve recusar.");
		assertEquals(hospitalizationRepository.records.length, 0, "Nada pode ser gravado.");
		assertEquals(ownerRepository.records[0].name, OWNER.name);
	});

	await t.step(
		"a excepção fica presa ao episódio e não é herdada pelo episódio seguinte",
		async () => {
			const { service, hospitalizationRepository } = await makeService();

			await service.newHospitalization(
				"sys-1",
				{ ...HOSPITALIZATION_DATA, contact: CONTACT },
				BUDGET_DATA,
				RECEPTION,
			);
			await service.endHospitalization("sys-1", RECEPTION);

			await service.newHospitalization(
				"sys-1",
				HOSPITALIZATION_DATA,
				BUDGET_DATA,
				RECEPTION,
			);

			const episodes = hospitalizationRepository.records.toSorted((a, b) =>
				a.entryDate.getTime() - b.entryDate.getTime()
			);
			assertEquals(episodes.length, 2);
			assertEquals(episodes[0].contact?.name, CONTACT.name, "O 1.º episódio mantém a excepção.");
			assertEquals(episodes[1].contact, undefined, "O 2.º episódio não herda a excepção.");
		},
	);

	await t.step("o contacto não entra no tutor nem muda o identificador do proprietário", async () => {
		const { service, ownerRepository } = await makeService();

		await service.newHospitalization(
			"sys-1",
			{ ...HOSPITALIZATION_DATA, contact: { name: "Outro", phoneNumber: "924444444", whatsapp: false } },
			BUDGET_DATA,
			RECEPTION,
		);

		assertEquals(ownerRepository.records.length, 1, "Não pode duplicar o tutor.");
		assertEquals(ownerRepository.records[0].ownerId.equals(ID.fromString(OWNER_ID)), true);
		assertEquals(ownerRepository.records[0].hasWhatsApp(), true);
	});
});
