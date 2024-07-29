import { CrmService, LastReportData } from "application/crm_service.ts";
import { assertEquals, assertInstanceOf, assertObjectMatch } from "dev_deps";
import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { ReportNotFound } from "domain/crm/report/report_not_found_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemReportRepository } from "persistence/inmem/inmem_report_repository.ts";
import { ID } from "shared/id.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";

Deno.test("Crm Service - List Owners", async (t) => {
	await t.step("Deve recuperar os proprietários do repositório", async () => {
		const { service, ownerRepo } = makeService();
		await ownerRepo.save(john);

		const owners = await service.getAll();

		assertEquals(owners.length, 1);
	});

	await t.step(
		"Deve retornar uma lista vazia se não houver proprietários",
		async () => {
			const { service } = makeService();

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
			const { service, ownerRepo } = makeService();
			await ownerRepo.save(john);

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
			const { service } = makeService();

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
					types: ["Ração"],
					datetime: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Normal",
				},
				comments: "Paciente está bem",
			};

			const { service } = makeService({ patientRepository: new PatientRepositoryStub() });

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
					types: ["Ração"],
					datetime: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Vómito",
					aspect: "Sangue",
				},
				comments: "Paciente está bem",
			};
			const { service } = makeService();

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
					types: ["Ração"],
					datetime: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Escuro",
				},
				comments: "Paciente está bem",
			};
			const { service, reportRepo } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.patientId.value, data.patientId);
			assertEquals(report.stateOfConsciousness, ["Consciente"]);
		},
	);

	await t.step(
		"Ao criar o **Report** para o Tutor, deve registar mais de um estado de consciência do paciente",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente", "Alerta"],
				food: {
					types: ["Ração"],
					datetime: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Amarelo",
				},
				comments: "Paciente está bem, e comeu bem",
			};

			const { service, reportRepo } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.stateOfConsciousness, ["Consciente", "Alerta"]);
		},
	);

	await t.step(
		"Ao criar o **Report** para o tutor, deve registar a comida fornecida ao paciente",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente"],
				food: {
					types: ["Ração"],
					datetime: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Amarelo",
				},
				comments: "Paciente ainda não come muito",
			};

			const { service, reportRepo } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.food.level, data.food.level);
			assertEquals(report.food.datetime, new Date(data.food.datetime));
			assertEquals(report.food.types, data.food.types);
		},
	);

	await t.step(
		"Ao criar o **Report** para o tutor, deve registar as descargas que o paciente teve",
		async () => {
			const data = {
				patientId: "1900BA",
				stateOfConsciousness: ["Consciente"],
				food: {
					types: ["Ração"],
					datetime: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Normal",
				},
				comments: "Paciente está bem",
			};

			const { service, reportRepo } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

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
					types: ["Ração"],
					datetime: "2021-09-01T00:00:00",
					level: "1",
				},
				discharge: {
					type: "Urina",
					aspect: "Normal",
				},
				comments: "Paciente está bem",
			};

			const { service, reportRepo } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});

			await service.registerReport(data);

			const report = await reportRepo.get(ID.fromString(data.patientId));

			assertEquals(report.comments, data.comments);
		},
	);
});

Deno.test("Crm Service - Get Last Report", async (t) => {
	await t.step("Deve recuperar o último relatório do paciente", async () => {
		const { service, ownerRepo, reportRepo, budgetRepo } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await budgetRepo.save(budget);
		await ownerRepo.save(john);
		await reportRepo.save(report);

		const lastReportOrErr = await service.lastReport("1900BA", "1001", "111");

		const output = <LastReportData> lastReportOrErr.value;

		assertObjectMatch(output, payload);
	});

	await t.step("Deve adicionar o estado do orçamento ao relatório", async () => {
		const { service, ownerRepo, reportRepo, budgetRepo } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await budgetRepo.save(budget);
		await ownerRepo.save(john);
		await reportRepo.save(report);

		const lastReportOrErr = await service.lastReport("1900BA", "1001", "111");

		const output = <LastReportData> lastReportOrErr.value;

		assertEquals(output.budgetStatus, "PENDENTE");
	});

	await t.step("Deve constar o identificador do paciente no relatório", async () => {
		const { service, ownerRepo, reportRepo, budgetRepo } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});

		await budgetRepo.save(budget);
		await ownerRepo.save(john);
		await reportRepo.save(report);

		const lastReportOrErr = await service.lastReport("1900BA", "1001", "111");

		const output = <LastReportData> lastReportOrErr.value;

		assertEquals(output.patientId, "some-id-10");
	});

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não pertencer ao tutor",
		async () => {
			const { service, ownerRepo } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			await ownerRepo.save(huston);

			const err = await service.lastReport("1900BA", "1002", "111");

			assertEquals(err.isLeft(), true);
			assertInstanceOf(err.value, PatientNotFound);
		},
	);

	await t.step(
		"Deve retornar @PatientNotHospitalized se o paciente não estiver hospitalizado",
		async () => {
			const { service, ownerRepo } = makeService({
				patientRepository: new PatientRepositoryStub(),
			});
			await ownerRepo.save(john);

			const err = await service.lastReport("1927BA", "1001", "111");

			assertEquals(err.isLeft(), true);
			assertInstanceOf(err.value, PatientNotHospitalized);
		},
	);

	await t.step("Deve retornar @OwnerNotFound se o dono não for encontrado", async () => {
		const { service } = makeService();

		const err = await service.lastReport("1001", "1001", "111");

		assertEquals(err.isLeft(), true);
		assertInstanceOf(err.value, OwnerNotFound);
	});

	await t.step("Deve retornar @PatientNotFound se o paciente não for encontrado", async () => {
		const { service, ownerRepo } = makeService();
		await ownerRepo.save(john);

		const err = await service.lastReport("1900BA", "1001", "111");

		assertEquals(err.isLeft(), true);
		assertInstanceOf(err.value, PatientNotFound);
	});

	await t.step("Deve retornar @ReportNotFound se o relatório não for encontrado", async () => {
		const { service, ownerRepo } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await ownerRepo.save(john);

		const err = await service.lastReport("1900BA", "1001", "111");

		assertEquals(err.isLeft(), true);
		assertInstanceOf(err.value, ReportNotFound);
	});

	await t.step("Deve retornar @BudgetNotFound se o orçamento não for encontrado", async () => {
		const { service, ownerRepo, reportRepo } = makeService({
			patientRepository: new PatientRepositoryStub(),
		});
		await ownerRepo.save(john);
		await reportRepo.save(report);

		const err = await service.lastReport("1900BA", "1001", "111");

		assertEquals(err.isLeft(), true);
		assertInstanceOf(err.value, BudgetNotFound);
	});
});

const john = new Owner("1001", "John", "933001122");
const huston = new Owner("1002", "Huston", "933843893");
const food = new Food(["Ração"], "1", "2021-09-01T00:00:00");
const discharge = new Discharge("Urina", "Normal");
const report = new Report(
	ID.random(),
	ID.fromString("1900BA"),
	["Consciente"],
	food,
	discharge,
	"Paciente está bem",
);

const budget = new Budget("111", "2020-01-01T00:00:00", "2020-01-10T00:00:00", "PENDENTE");

const payload = {
	ownerName: "John",
	patientName: "Rex",
	stateOfConsciousness: ["Consciente"],
	food: {
		types: ["Ração"],
		level: "1",
		datetime: new Date("2021-09-01T00:00:00").toISOString(),
	},
	discharge: {
		type: "Urina",
		aspect: "Normal",
	},
	comments: "Paciente está bem",
};

interface Options {
	patientRepository: PatientRepository;
}

function makeService(opts?: Options) {
	const ownerRepo = new InmemOwnerRepository();
	const reportRepo = new InmemReportRepository();
	const patientRepo = opts?.patientRepository ?? new InmemPatientRepository();
	const budgetRepo = new InmemBudgetRepository();

	const service = new CrmService(
		ownerRepo,
		patientRepo,
		reportRepo,
		budgetRepo,
	);

	return {
		service,
		ownerRepo,
		patientRepo,
		reportRepo,
		budgetRepo,
	};
}
