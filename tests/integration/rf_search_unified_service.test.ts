import { assertEquals, assertInstanceOf } from "dev_deps";
import { PatientService } from "application/patient_service.ts";
import { InvalidSearchTerm } from "domain/patient/invalid_search_term_error.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * RF — pesquisa unificada de pacientes na nova hospitalização.
 *
 * Um único termo pesquisa ID paciente, ID tutor, nome paciente e nome tutor.
 * Relevância: exacto > prefixo > ocorrência parcial. Em empate, a prioridade dos
 * campos é ID paciente > ID tutor > nome paciente > nome tutor. Limite 10.
 * A pesquisa exige permissão de hospitalização e nunca carrega a tabela toda.
 */

const MEDVET = "medvet-search";
const RECEPTION = "reception-search";

function patient(systemId: string, patientId: string, name: string, ownerId: string): Patient {
	return Patient.restore({
		systemId,
		patientId,
		name,
		specie: "CANINO",
		breed: "bulldog",
		birthDate: "2013-07-01",
		ownerId,
		status: PatientStatus.Hospitalized,
	});
}

function makeService(patients: Patient[], ownerNames: Record<string, string>, role = Role.MedVet) {
	const userRepository = new InmemUserRepository([new User(MEDVET, MEDVET, role)]);
	const patientRepository = new InmemPatientRepository(patients, ownerNames);

	const service = new PatientService(
		patientRepository,
		new InmemOwnerRepository(),
		new InmemHospitalizationRepository(),
		new InmemBudgetRepository(),
		new InmemAlertRepository(),
		userRepository,
		new AlertNotifierDummy(),
	);

	return { service, patientRepository };
}

Deno.test("pesquisa unificada - validação e autorização", async (t) => {
	await t.step("exige permissão de hospitalização", async () => {
		const { service } = makeService([], {}, Role.Trainee);

		const result = await service.searchPatients("ab", MEDVET);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, PermissionDenied);
	});

	await t.step("utilizador inválido devolve @PermissionDenied sem rebentar", async () => {
		const { service } = makeService([], {}, Role.MedVet);

		const result = await service.searchPatients("ab", "nao-existe");

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, PermissionDenied);
	});

	await t.step("termo com menos de 2 caracteres é recusado", async () => {
		const { service } = makeService([], {}, Role.MedVet);

		for (const term of ["", " ", "a"]) {
			const result = await service.searchPatients(term, MEDVET);
			assertEquals(result.isLeft(), true, `termo ${JSON.stringify(term)}`);
			assertInstanceOf(result.value, InvalidSearchTerm);
		}
	});

	await t.step("termo com mais de 50 caracteres é recusado", async () => {
		const { service } = makeService([], {}, Role.MedVet);

		const result = await service.searchPatients("a".repeat(51), MEDVET);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, InvalidSearchTerm);
	});

	await t.step("aceita 2 e 50 caracteres, com trim", async () => {
		const { service } = makeService([], {}, Role.MedVet);

		assertEquals((await service.searchPatients("ab", MEDVET)).isRight(), true);
		assertEquals((await service.searchPatients("a".repeat(50), MEDVET)).isRight(), true);
		assertEquals((await service.searchPatients("  ab  ", MEDVET)).isRight(), true);
	});
});

Deno.test("pesquisa unificada - relevância e prioridade de campos", async (t) => {
	const patients = [
		patient("s-exact", "ZZTOKEN", "Outro Nome", "own-exact"),
		patient("s-prefix", "ZZTOKEN-EXTRA", "Outro Nome", "own-prefix"),
		patient("s-partial", "AAA-ZZTOKEN-BBB", "Outro Nome", "own-partial"),
		patient("s-other", "SEM-MATCH", "Outro Nome", "own-other"),
	];
	const ownerNames = {
		"own-exact": "Tutor Um",
		"own-prefix": "Tutor Dois",
		"own-partial": "Tutor Tres",
		"own-other": "Tutor Quatro",
	};

	await t.step("exacto > prefixo > parcial e ignora quem não corresponde", async () => {
		const { service } = makeService(patients, ownerNames, Role.MedVet);

		const result = await service.searchPatients("ZZTOKEN", MEDVET);

		assertEquals(result.isRight(), true);
		assertEquals(
			result.value.map((item) => item.patient.systemId.value),
			["s-exact", "s-prefix", "s-partial"],
		);
	});

	await t.step("em empate, ID paciente > ID tutor > nome paciente > nome tutor", async () => {
		const tie = "Q7TIE";
		const tiePatients = [
			patient("s-name", "P-NAO", tie, "own-name"), // nome paciente
			patient("s-ownerid", "P-NAO2", "Sem", tie), // ID tutor
			patient("s-patientid", tie, "Sem", "own-a"), // ID paciente
			patient("s-ownername", "P-NAO3", "Sem", "own-ownername"), // nome tutor
		];
		const names = {
			"own-name": "Tutor X",
			"own-ownerid": "Tutor Y",
			"own-a": "Tutor Z",
			"own-ownername": tie,
		};

		const { service } = makeService(tiePatients, names, Role.MedVet);

		const result = await service.searchPatients(tie, MEDVET);

		assertEquals(result.isRight(), true);
		assertEquals(
			result.value.map((item) => item.patient.systemId.value),
			["s-patientid", "s-ownerid", "s-name", "s-ownername"],
		);
	});

	await t.step("case-insensitive", async () => {
		const { service } = makeService(patients, ownerNames, Role.MedVet);

		const result = await service.searchPatients("zztoken", MEDVET);

		assertEquals(result.isRight(), true);
		assertEquals(result.value[0].patient.systemId.value, "s-exact");
	});

	await t.step("limita a 10 resultados", async () => {
		const many = Array.from({ length: 12 }, (_, i) =>
			patient(`s-many-${i}`, `LIMITTOKEN-${String(i).padStart(2, "0")}`, "Nome", `own-many-${i}`)
		);
		const names: Record<string, string> = {};
		for (let i = 0; i < 12; i++) names[`own-many-${i}`] = "Tutor";

		const { service } = makeService(many, names, Role.MedVet);

		const result = await service.searchPatients("LIMITTOKEN", MEDVET);

		assertEquals(result.isRight(), true);
		assertEquals(result.value.length, 10);
	});

	await t.step("percentagem e underscore são literais (sem wildcards)", async () => {
		const literal = [
			patient("s-pct", "P-1", "q%xz", "o-1"),
			patient("s-pct-wild", "P-2", "qwxz", "o-2"),
			patient("s-us", "P-3", "q_xy", "o-3"),
			patient("s-us-wild", "P-4", "qwyx", "o-4"),
		];
		const names = { "o-1": "T1", "o-2": "T2", "o-3": "T3", "o-4": "T4" };

		const { service } = makeService(literal, names, Role.MedVet);

		const pct = await service.searchPatients("q%x", MEDVET);
		assertEquals(pct.isRight(), true);
		assertEquals(pct.value.map((item) => item.patient.systemId.value), ["s-pct"]);

		const us = await service.searchPatients("q_x", MEDVET);
		assertEquals(us.isRight(), true);
		assertEquals(us.value.map((item) => item.patient.systemId.value), ["s-us"]);
	});
});
