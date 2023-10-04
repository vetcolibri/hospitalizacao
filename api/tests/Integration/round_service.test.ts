import { RoundService } from "../../application/round_service.ts";
import { PatientRepositoryStub } from "../../test_double/stubs/patient_repository_stub.ts";
import { assertEquals, assertSpyCall, assertSpyCalls, spy } from "../../dev_deps.ts";
import { UserRepositoryStub } from "../../test_double/stubs/user_repository_stub.ts";
import { InmemRoundRepository } from "../../adaptors/inmem/inmem_round_repository.ts";

Deno.test("Round Service", async (t) => {
	await t.step("Deve recuperar o paciente no repositório", async () => {
		const parameter = {
			name: "heartRate",
			value: 78,
		};
		const patientRepository = new PatientRepositoryStub();
		const userRepository = new UserRepositoryStub();
		const roundRepository = new InmemRoundRepository();
		const patientSpy = spy(patientRepository, "get");
		const service = new RoundService(roundRepository, patientRepository, userRepository);

		await service.new(patientId, userId, date, parameter);
		assertSpyCall(patientSpy, 0, { args: [patientId] });
		assertSpyCalls(patientSpy, 1);
	});
	await t.step("Deve recuperar o medVet no repositório", async () => {
		const parameter = {
			name: "heartRate",
			value: 78,
		};

		const patientRepository = new PatientRepositoryStub();
		const userRepository = new UserRepositoryStub();
		const roundRepository = new InmemRoundRepository();

		const userSpy = spy(userRepository, "get");
		const service = new RoundService(roundRepository, patientRepository, userRepository);

		await service.new(patientId, userId, date, parameter);

		assertSpyCall(userSpy, 0, { args: [userId] });
		assertSpyCalls(userSpy, 1);
	});
	await t.step("Deve salvar a ronda de exames do paciente no repositório.", async () => {
		const parameter = {
			name: "heartRate",
			value: 78,
		};
		const patientRepository = new PatientRepositoryStub();
		const userRepository = new UserRepositoryStub();
		const roundRepository = new InmemRoundRepository();
		const roundSpy = spy(roundRepository, "save");
		const service = new RoundService(roundRepository, patientRepository, userRepository);

		await service.new(patientId, userId, date, parameter);

		assertSpyCall(roundSpy, 0);
		assertSpyCalls(roundSpy, 1);

		const round = await roundRepository.last();
		const patient = round.getPatient();
		assertEquals(patient.patientId, patientId);
	});
	await t.step(
		"Deve adicionar o parâmetro da Frequência cardiaca a ronda de exames",
		async () => {
			const parameter = {
				name: "heartRate",
				value: 78,
			};
			const patientRepository = new PatientRepositoryStub();
			const userRepository = new UserRepositoryStub();
			const roundRepository = new InmemRoundRepository();
			const service = new RoundService(roundRepository, patientRepository, userRepository);

			await service.new(patientId, userId, date, parameter);

			const round = await roundRepository.last();
			const heartRate = round.getParameter("heartRate");

			assertEquals(round.totalParameters(), 1);
			assertEquals(heartRate?.name, "heartRate");
			assertEquals(heartRate?.getValue(), 78);
		},
	);
});

const patientId = "some-id";
const userId = "some-user-id";
const date = "2023-09-10T11:54:33.651Z";
