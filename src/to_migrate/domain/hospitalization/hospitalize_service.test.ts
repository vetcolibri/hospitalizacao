import { assertEquals, assertInstanceOf } from "@deps/assert";
import { InmemHospitalizationRepository } from "@infra/persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemPatientRepository } from "@infra/persistence/inmem/inmem_patient_repository.ts";
import { HospitalizeService } from "@domain/hospitalization/hospitalize_service.ts";
import { InmemBudgetRepository } from "@infra/persistence/inmem/inmem_budget_repository.ts";
import { InmemOwnerRepository } from "@infra/persistence/inmem/inmem_owner_repository.ts";
import { InmemUserRepository } from "@infra/persistence/inmem/inmem_user_repository.ts";
import { BudgetStatus } from "@domain/budget/budget.ts";
import { assert } from "@deps/assert";

import { PatientStatus } from "@domain/patient/patient.ts";
import { ID } from "@shared/id.ts";
import { assertNotEquals } from "@deps/assert/not-equals";
import { PatientAlreadyHospitalizedError } from "@domain/patient/patient_already_hospitalized_error.ts";
import { InvalidDateError } from "@domain/hospitalization/invalid_date_error.ts";
import { OWNERS } from "../../test_doubles/owners_test_data.ts";
import { DISCHARGED_PATIENTS, HOSPITALIZED_PATIENTS, PATIENTS } from "../../test_doubles/patients_test_data.ts";
import { ADMIN_USERS, USERS } from "../../test_doubles/users_test_data.ts";

Deno.test("Hospitalize Service", async (t) => {
	await t.step("Deve abrir uma nova hospitalização", async () => {
		const { service, hospitalizationRepository } = makeService();

		const patientId = DISCHARGED_PATIENTS[2].patientId.value;
		const systemId = DISCHARGED_PATIENTS[2].systemId;
		const ownerId = DISCHARGED_PATIENTS[2].patientId.value;

		const voidOrErr = await service.hospitalize(
			ADMIN_USERS[0].username.value,
			{ patientId: patientId },
			{ ownerId: ownerId },
			{ complaints: [], weight: 45, diagnostics: [], entryDate: "2024-01-01" },
			{ status: BudgetStatus.Pending, startOn: "2025-01-25", endOn: "2025-02-01" },
		);

		const hospitalizationOrErr = await hospitalizationRepository.findByPatientId(systemId);

		assert(voidOrErr.isRight(), voidOrErr.left?.message);
		assert(hospitalizationOrErr.isRight(), hospitalizationOrErr.left?.message);
		assertEquals(hospitalizationOrErr.value.patientId.value, systemId.value);
	});

	await t.step("Deve mudar o estado do paciente para hospitalized", async () => {
		const { service, patientRepository } = makeService();

		const patientId = DISCHARGED_PATIENTS[1].patientId;
		const ownerId = DISCHARGED_PATIENTS[1].patientId;

		await service.hospitalize(
			ADMIN_USERS[0].username.value,
			{ patientId: patientId.value },
			{ ownerId: ownerId.value },
			{ complaints: [], weight: 45, diagnostics: [], entryDate: "2024-01-01" },
			{ status: BudgetStatus.Pending, startOn: "2025-01-25", endOn: "2025-02-01" },
		);

		const patientOrErr = await patientRepository.findByPatientId(patientId);

		assert(patientOrErr.isRight(), patientOrErr.left?.message);
		assertEquals(patientOrErr.value.status, PatientStatus.Hospitalized);
	});

	await t.step("Deve criar o paciente no repositório caso o paciente não exista", async () => {
		const { service, patientRepository } = makeService();

		// Define um novo ID para o paciente que não exista no repositório
		const newPatientId = "PATIENT_NEW_001";
		const newOwnerId = "OWNER_NEW_001";

		// Tenta hospitalizar o paciente, esperando que o serviço crie o paciente se ele não existir
		const result = await service.hospitalize(
			ADMIN_USERS[0].username.value,
			{
				patientId: newPatientId,
				"name": "Loki",
				birthDate: "2024-01-01",
				specie: "Dog",
				breed: "Poodle",
			},
			{ ownerId: newOwnerId },
			{
				complaints: ["Queixa teste"],
				weight: 50,
				diagnostics: ["Diagnóstico teste"],
				entryDate: "2024-01-02",
			},
			{ status: BudgetStatus.Pending, startOn: "2025-01-26", endOn: "2025-02-02" },
		);

		// Assegura que a operação foi bem-sucedida
		assert(result.isRight(), result.left?.message);

		// Verifica se o paciente foi criado no repositório
		const patientOrErr = await patientRepository.findByPatientId(ID.fromString(newPatientId));
		assert(patientOrErr.isRight(), patientOrErr.left?.message);
		assertEquals(patientOrErr.value.patientId.value, newPatientId);
	});

	await t.step("Deve actualizar o owner do pet caso seja diferente do atual", async () => {
		const { service, patientRepository } = makeService();
		// Utiliza um paciente existente para testar a atualização do owner
		const patientId = DISCHARGED_PATIENTS[0].patientId.value;
		const originalOwnerId = DISCHARGED_PATIENTS[0].patientId.value;
		const ownerId = OWNERS[0].ownerId.value;

		// Realiza a hospitalização com o owner original
		await service.hospitalize(
			ADMIN_USERS[0].username.value,
			{ patientId: patientId },
			{ ownerId },
			{ complaints: [], weight: 40, diagnostics: [], entryDate: "2024-03-01" },
			{ status: BudgetStatus.Pending, startOn: "2025-03-01", endOn: "2025-03-05" },
		);

		let patientOrErr = await patientRepository.findByPatientId(ID.fromString(patientId));
		assert(patientOrErr.isRight(), patientOrErr.left?.message);
		assertNotEquals(ownerId, originalOwnerId);
		assertEquals(patientOrErr.value.ownerId.value, ownerId);

		await service.hospitalize(
			ADMIN_USERS[0].username.value,
			{ patientId: patientId },
			{ ownerId: ownerId },
			{
				complaints: ["Atualização do tutor"],
				weight: 41,
				diagnostics: [],
				entryDate: "2024-03-02",
			},
			{ status: BudgetStatus.Pending, startOn: "2025-03-02", endOn: "2025-03-06" },
		);

		patientOrErr = await patientRepository.findByPatientId(ID.fromString(patientId));
		assert(patientOrErr.isRight(), patientOrErr.left?.message);
		assertEquals(patientOrErr.value.ownerId.value, ownerId);
	});

	await t.step("Deve criar o owner no repositório caso não exista", async () => {
		const { service, ownerRepository } = makeService();

		const newOwnerId = "OWNER_NEW_002";
		const patientId = DISCHARGED_PATIENTS[1].patientId.value;

		const result = await service.hospitalize(
			ADMIN_USERS[0].username.value,
			{ patientId },
			{ ownerId: newOwnerId },
			{
				complaints: ["Teste de criação de owner"],
				weight: 30,
				diagnostics: ["Nenhum diagnóstico"],
				entryDate: "2024-02-01",
			},
			{ status: BudgetStatus.Pending, startOn: "2025-01-15", endOn: "2025-01-20" },
		);

		assert(result.isRight(), result.left?.message);

		const ownerOrErr = await ownerRepository.getById(ID.fromString(newOwnerId));
		assert(ownerOrErr.isRight(), ownerOrErr.left?.message);
		assertEquals(ownerOrErr.value.ownerId.value, newOwnerId);
	});

	await t.step(
		"Deve atualizar o número de telefone do owner caso o número de telemóvel seja passado",
		async () => {
			const { service, ownerRepository } = makeService();

			const patientId = DISCHARGED_PATIENTS[0].patientId.value;
			const ownerId = DISCHARGED_PATIENTS[0].ownerId.value;
			const newPhoneNumber = "933445566";

			const result = await service.hospitalize(
				ADMIN_USERS[0].username.value,
				{ patientId },
				{ ownerId, phoneNumber: newPhoneNumber },
				{
					complaints: ["Teste de atualização de telefone"],
					weight: 35,
					diagnostics: ["Nenhum diagnóstico"],
					entryDate: "2024-04-01",
				},
				{ status: BudgetStatus.Pending, startOn: "2025-04-01", endOn: "2025-04-05" },
			);

			assert(result.isRight(), result.left?.message);

			const ownerOrErr = await ownerRepository.getById(ID.fromString(ownerId));
			assert(ownerOrErr.isRight(), ownerOrErr.left?.message);
			assertEquals(ownerOrErr.value.phoneNumber, newPhoneNumber);
		},
	);

	await t.step(
		"Deve retornar @PatientAlreadyHospitalizedError se o paciente já estiver hospitalizado",
		async () => {
			const { service } = makeService();

			const patientId = HOSPITALIZED_PATIENTS[0].patientId.value;
			const ownerId = HOSPITALIZED_PATIENTS[0].ownerId.value;

			const result = await service.hospitalize(
				ADMIN_USERS[0].username.value,
				{ patientId },
				{ ownerId },
				{ complaints: [], weight: 40, diagnostics: [], entryDate: "2024-03-01" },
				{ status: BudgetStatus.Pending, startOn: "2025-03-01", endOn: "2025-03-05" },
			);

			assert(result.isLeft(), "Esperava-se um erro de paciente já hospitalizado");
			assertInstanceOf(result.value, PatientAlreadyHospitalizedError);
		},
	);

	await t.step(
		"Deve retornar @InvalidDate se a data de alta médica for inferior a data actual",
		async () => {
			const leaveDate = new Date().getTime() - 5000 * 60 * 60 * 24;
			const { service } = makeService();
			const patientId = DISCHARGED_PATIENTS[0].patientId.value;
			const ownerId = DISCHARGED_PATIENTS[0].ownerId.value;

			const error = await service.hospitalize(
				ADMIN_USERS[0].username.value,
				{ patientId },
				{ ownerId },
				{
					complaints: [],
					weight: 40,
					diagnostics: [],
					entryDate: new Date().toISOString(),
					dischargeDate: new Date(leaveDate).toISOString(),
				},
				{ status: BudgetStatus.Pending, startOn: "2025-03-01", endOn: "2025-03-05" },
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidDateError);
		},
	);

	await t.step(
		"Deve retornar @InvalidDateError caso a data de internamento seja superior a actual",
		async () => {
			const { service } = makeService();
			const patientId = DISCHARGED_PATIENTS[0].patientId.value;
			const ownerId = DISCHARGED_PATIENTS[0].ownerId.value;

			const futureEntryDate = new Date().getTime() + 1000 * 60 * 60 * 24 * 2;

			const error = await service.hospitalize(
				ADMIN_USERS[0].username.value,
				{ patientId },
				{ ownerId },
				{
					complaints: [],
					weight: 40,
					diagnostics: [],
					entryDate: new Date(futureEntryDate).toISOString(),
				},
				{ status: BudgetStatus.Pending, startOn: "2025-03-01", endOn: "2025-03-05" },
			);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidDateError);
		},
	);

	// await t.step(
	// 	"Deve retornar @InvalidNumber se o número de queixas for maior que 10",
	// 	async () => {
	// 		const patientRepository = new InmemPatientRepository();
	// 		const { service } = makeService({ patientRepository });

	// 		const error = await service.hospitalize({
	// 			...hospitalizeData,
	// 			hospitalizationData: {
	// 				...hospitalizeData.hospitalizationData,
	// 				complaints: invalidComplaints,
	// 			},
	// 		});

	// 		assertEquals(error.isLeft(), true);
	// 		assertInstanceOf(error.value, InvalidNumber);
	// 	},
	// );

	// await t.step(
	// 	"Deve retornar @InvalidNumber se o número de diagnosticos for maior que 5",
	// 	async () => {
	// 		const patientRepository = new InmemPatientRepository();
	// 		const { service } = makeService({ patientRepository });

	// 		const error = await service.hospitalize({
	// 			...hospitalizeData,
	// 			hospitalizationData: {
	// 				...hospitalizeData.hospitalizationData,
	// 				diagnostics: invalidDiagnostics,
	// 			},
	// 		});

	// 		assertEquals(error.isLeft(), true);
	// 		assertInstanceOf(error.value, InvalidNumber);
	// 	},
	// );

	// await t.step(
	// 	"Deve retornar @InvalidDate se a data de nascimento for maior que a data actual",
	// 	async () => {
	// 		const patientRepository = new InmemPatientRepository();
	// 		const { service } = makeService({ patientRepository });
	// 		const invalidBirthDate = new Date().getTime() + 1000 * 60 * 60 * 24;

	// 		const error = await service.hospitalize({
	// 			...hospitalizeData,
	// 			patientData: {
	// 				...hospitalizeData.patientData,
	// 				birthDate: new Date(invalidBirthDate).toISOString(),
	// 			},
	// 		});

	// 		assertEquals(error.isLeft(), true);
	// 		assertInstanceOf(error.value, InvalidDateError);
	// 	},
	// );

	// await t.step(
	// 	"Deve retornar @InvalidDate se a data de entrada na hospitalização for a data actual",
	// 	async () => {
	// 		const patientRepository = new InmemPatientRepository();
	// 		const invalidEntryDate = new Date().getTime() + 1000 * 60 * 60 * 24;

	// 		const { service } = makeService({ patientRepository });

	// 		const error = await service.hospitalize({
	// 			...hospitalizeData,
	// 			hospitalizationData: {
	// 				...hospitalizeData.hospitalizationData,
	// 				entryDate: new Date(invalidEntryDate).toISOString(),
	// 			},
	// 		});

	// 		assertEquals(error.isLeft(), true);
	// 		assertInstanceOf(error.value, InvalidDateError);
	// 	},
	// );

	// await t.step("Deve registrar os dados do orçamento para a hospitalização", async () => {
	// 	const patientRepository = new InmemPatientRepository();
	// 	const { service, budgetRepository } = makeService({ patientRepository });

	// 	await service.hospitalize(hospitalizeData);

	// 	const budget = await budgetRepository.last();

	// 	assert(budget.hospitalizationId.value !== undefined);
	// 	assertEquals(budget.status, BudgetStatus.UnPaid);
	// });

	// await t.step(
	// 	"Deve retornar @PermissionDenied se o utilizador não tiver permissão para registar novo paciente",
	// 	async () => {
	// 		const { service } = makeService();
	// 		const data = { ...hospitalizeData, username: "john.doe123" };

	// 		const error = await service.hospitalize(data);

	// 		assertEquals(error.isLeft(), true);
	// 		assertInstanceOf(error.value, PermissionDenied);
	// 	},
	// );
});

function makeService({
	userRepository = new InmemUserRepository(USERS),
	patientRepository = new InmemPatientRepository(PATIENTS),
	hospitalizationRepository = new InmemHospitalizationRepository(),
	budgetRepository = new InmemBudgetRepository(),
	ownerRepository = new InmemOwnerRepository(OWNERS),
} = {}) {
	const service = new HospitalizeService(
		userRepository,
		ownerRepository,
		patientRepository,
		hospitalizationRepository,
		budgetRepository,
	);

	return {
		service,
		patientRepository,
		hospitalizationRepository,
		budgetRepository,
		ownerRepository,
		userRepository,
	};
}
