import { assertEquals, assertInstanceOf } from "dev_deps";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { ReportRepository } from "domain/crm/report/report_repository.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemReportRepository } from "persistence/inmem/inmem_report_repository.ts";
import { ID } from "shared/id.ts";
import { CrmService } from "../../src/application/crm_service.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";

Deno.test("Crm Service - List Owners", async (t) => {
	await t.step("Deve recuperar os proprietários do repositório", async () => {
		const ownerRepo = new InmemOwnerRepository();
		await ownerRepo.save(john);
		const patientRepo = new InmemPatientRepository();
		const reportRepo: ReportRepository = new InmemReportRepository();
		const service = new CrmService(ownerRepo, patientRepo, reportRepo);

		const owners = await service.getAll();

		assertEquals(owners.length, 1);
	});

	await t.step(
		"Deve retornar uma lista vazia se não houver proprietários",
		async () => {
			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new InmemPatientRepository();
			const reportRepo: ReportRepository = new InmemReportRepository();
			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			const owners = await service.getAll();

			assertEquals(owners.length, 0);
			assertEquals(owners, []);
		},
	);
});

Deno.test("Crm Service - Find Owner", async (t) => {
	await t.step(
		"Deve recuperar o dono do paciente se ele existir no repositório.",
		async () => {
			const ownerRepo = new InmemOwnerRepository();
			await ownerRepo.save(john);
			const patientRepo = new InmemPatientRepository();
			const reportRepo: ReportRepository = new InmemReportRepository();
			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			const ownerOrErr = await service.findOwner("1001");

			const owner = <Owner> ownerOrErr.value;

			assertEquals(owner.ownerId.value, "1001");
			assertEquals(owner.name, "John");
			assertEquals(owner.phoneNumber, "933001122");
		},
	);
	await t.step(
		"Deve retornar @OwnerNotFound se o dono não existir no repositório.",
		async () => {
			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new InmemPatientRepository();
			const reportRepo: ReportRepository = new InmemReportRepository();
			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			const err = await service.findOwner("1002");

			assertEquals(err.isLeft(), true);
			assertInstanceOf(err.value, OwnerNotFound);
		},
	);
});

Deno.test("Crm Service - Register patient report", async (t) => {
	await t.step(
		"Não deve registar o relatório para o tutor, caso o paciente não esteja hospitalizado",
		async () => {
			const data = {
				patientId: "1927BA",
				stateOfConsciousness: ["Consciente"],
				food: {
					type: ["Ração"],
					date: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Normal",
				},
				comments: "Paciente está bem",
			};

			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new PatientRepositoryStub();
			const reportRepo: ReportRepository = new InmemReportRepository();
			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			const err = await service.registerReport(data);

			assertEquals(err.isLeft(), true);
			assertInstanceOf(err.value, PatientNotHospitalized);
		},
	);

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não for encontrado no repositório",
		async () => {
			const data = {
				patientId: "1001",
				stateOfConsciousness: ["Consciente"],
				food: {
					type: ["Ração"],
					date: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Vómito",
					aspect: "Sangue",
				},
				comments: "Paciente está bem",
			};
			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new InmemPatientRepository();
			const reportRepo: ReportRepository = new InmemReportRepository();
			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			const err = await service.registerReport(data);

			assertEquals(err.isLeft(), true);
			assertInstanceOf(err.value, PatientNotFound);
		},
	);

	await t.step(
		"Ao criar o **Report** para o Tutor, deve registar o estado de consciência do paciente",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente"],
				food: {
					type: ["Ração"],
					date: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Escuro",
				},
				comments: "Paciente está bem",
			};
			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new PatientRepositoryStub();
			const reportRepo: ReportRepository = new InmemReportRepository();
			const service = new CrmService(ownerRepo, patientRepo, reportRepo);
			const stateOfConsciousness = ["Consciente"];

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.patientId.value, data.patientId);
			assertEquals(report.stateOfConsciousness, stateOfConsciousness);
		},
	);

	await t.step(
		"Ao criar o **Report** para o Tutor, deve registar mais de um estado de consciência do paciente",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente", "Alerta"],
				food: {
					type: ["Ração"],
					date: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Amarelo",
				},
				comments: "Paciente está bem, e comeu bem",
			};
			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new PatientRepositoryStub();
			const reportRepo: ReportRepository = new InmemReportRepository();
			const service = new CrmService(ownerRepo, patientRepo, reportRepo);
			const stateOfConsciousness = ["Consciente", "Alerta"];

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.stateOfConsciousness, stateOfConsciousness);
		},
	);

	await t.step(
		"Ao criar o **Report** para o tutor, deve registar a comida fornecida ao paciente",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente"],
				food: {
					type: ["Ração"],
					date: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Amarelo",
				},
				comments: "Paciente ainda não come muito",
			};

			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new PatientRepositoryStub();
			const reportRepo = new InmemReportRepository();

			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.food.level, data.food.level);
			assertEquals(report.food.date, new Date(data.food.date));
			assertEquals(report.food.type, data.food.type);
		},
	);

	await t.step(
		"Ao criar o **Report** para o tutor, deve registar as descargas que o paciente teve",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente"],
				food: {
					type: ["Ração"],
					date: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Normal",
				},
				comments: "Paciente está bem",
			};

			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new PatientRepositoryStub();
			const reportRepo = new InmemReportRepository();

			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.discharge.type, data.discharge.type);
			assertEquals(report.discharge.aspect, data.discharge.aspect);
		},
	);

	await t.step(
		"Ao criar o **Report** para o tutor, deve registar o comentário do MedVet sobre o paciente",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente"],
				food: {
					type: ["Ração"],
					date: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Normal",
				},
				comments: "Paciente está bem",
			};

			const ownerRepo = new InmemOwnerRepository();
			const patientRepo = new PatientRepositoryStub();
			const reportRepo = new InmemReportRepository();

			const service = new CrmService(ownerRepo, patientRepo, reportRepo);

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.comments, data.comments);
		},
	);
});

const john = new Owner("1001", "John", "933001122");
