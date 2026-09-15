import { assert, assertEquals, assertInstanceOf } from "dev_deps";
import { CrmService } from "application/crm_service.ts";
import { Role, User } from "domain/auth/user.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { MultipleOpenHospitalizations } from "domain/hospitalization/multiple_open_hospitalizations_error.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemReportRepository } from "persistence/inmem/inmem_report_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";

/**
 * RF-13/RF-15 — um relatório pertence a EXACTAMENTE uma hospitalização aberta.
 * Sem escolher um episódio ao acaso (LIMIT 1) e sem cast de um Either left.
 */

const MEDVET = "john.doe1234";

const REPORT_DATA = {
	patientId: "sys-1",
	stateOfConsciousness: ["Alerta"],
	food: { types: ["Ração"], level: "1", datetime: "2026-01-02T10:00:00" },
	discharges: [],
	comments: "Paciente estável",
};

function makePatient(): Patient {
	return Patient.restore({
		systemId: "sys-1",
		patientId: "CVL-1",
		name: "Rex",
		specie: "CANINO",
		breed: "bulldog",
		birthDate: "2013-07-01",
		ownerId: "OWNER-1",
		status: PatientStatus.Hospitalized,
	});
}

function makeHospitalization(id: string): Hospitalization {
	return new Hospitalization(ID.fromString(id), "sys-1", 10, [], [], "2026-01-01");
}

function makeService(hospitalizations: Hospitalization[]) {
	const reportRepo = new InmemReportRepository();
	const service = new CrmService(
		new InmemOwnerRepository(),
		new InmemPatientRepository([makePatient()]),
		new InmemHospitalizationRepository(hospitalizations),
		reportRepo,
		new InmemBudgetRepository(),
		new InmemUserRepository([new User(MEDVET, MEDVET, Role.MedVet)]),
		{ findAll: () => Promise.resolve([]) },
	);

	return { service, reportRepo };
}

Deno.test("RF-13/RF-15 - relatório associado a exactamente uma hospitalização aberta", async (t) => {
	await t.step(
		"sem hospitalização aberta recusa com @HospitalizationNotFound e não grava",
		async () => {
			const { service, reportRepo } = makeService([]);

			const result = await service.registerReport(REPORT_DATA, MEDVET);

			assert(result.isLeft(), "Deve recusar.");
			assertInstanceOf(result.value, HospitalizationNotFound);
			assertEquals(
				await reportRepo.findByPatientId(ID.fromString("sys-1")),
				undefined,
				"Nenhum relatório pode ser gravado.",
			);
		},
	);

	await t.step(
		"com duas hospitalizações abertas recusa com @MultipleOpenHospitalizations e não grava",
		async () => {
			const { service, reportRepo } = makeService([
				makeHospitalization("h1"),
				makeHospitalization("h2"),
			]);

			const result = await service.registerReport(REPORT_DATA, MEDVET);

			assert(result.isLeft(), "Não pode escolher um episódio ao acaso.");
			assertInstanceOf(result.value, MultipleOpenHospitalizations);
			assertEquals(
				await reportRepo.findByPatientId(ID.fromString("sys-1")),
				undefined,
				"Nenhum relatório pode ser gravado.",
			);
		},
	);

	await t.step("com uma hospitalização aberta grava associada ao episódio", async () => {
		const { service, reportRepo } = makeService([makeHospitalization("h1")]);

		const result = await service.registerReport(REPORT_DATA, MEDVET);

		assert(result.isRight(), "Deve gravar.");
		const report = await reportRepo.findByPatientId(ID.fromString("sys-1"));
		assertEquals(report.hospitalizationId.value, "h1");
	});

	await t.step("findReports recusa quando há duas hospitalizações abertas", async () => {
		const { service } = makeService([makeHospitalization("h1"), makeHospitalization("h2")]);

		const result = await service.findReports("sys-1");

		assert(result.isLeft(), "Não pode escolher um episódio ao acaso.");
		assertInstanceOf(result.value, MultipleOpenHospitalizations);
	});

	await t.step("findReports devolve @HospitalizationNotFound sem episódio aberto", async () => {
		const { service } = makeService([]);

		const result = await service.findReports("sys-1");

		assert(result.isLeft(), "Deve recusar.");
		assertInstanceOf(result.value, HospitalizationNotFound);
	});
});
