import { RoundService } from "../../application/round_service.ts";
import { PatientRepositoryStub } from "../../test_double/stubs/patient_repository_stub.ts";
import { assertEquals, assertSpyCall, assertSpyCalls, spy } from "../../dev_deps.ts";
import { UserRepositoryStub } from "../../test_double/stubs/user_repository_stub.ts";
import { InmemRoundRepository } from "../../adaptors/inmem/inmem_round_repository.ts";
import { ID } from "../../domain/id.ts";
import { PatientRepository } from "../../domain/patients/patient_repository.ts";
import { InmemPatientRepository } from "../../adaptors/inmem/inmem_patient_repository.ts";
import { RoundRepository } from "../../domain/rounds/round_repository.ts";

Deno.test("Round Service - New Round", async (t) => {
	await t.step("Deve recuperar o paciente no repositório", async () => {
		const parameters = {
			heartRate: {
				name: "heartRate",
				value: 78,
			},
		};
		const { service, patientRepository } = makeService();
		const patientSpy = spy(patientRepository, "getById");

		await service.new(patientId, userId, parameters);
		assertSpyCall(patientSpy, 0, { args: [ID.New(patientId)] });
		assertSpyCalls(patientSpy, 1);
	});
	await t.step("Deve recuperar o medVet no repositório", async () => {
		const parameters = {
			heartRate: {
				name: "heartRate",
				value: 78,
			},
		};
		const { service, userRepository } = makeService();
		const userSpy = spy(userRepository, "get");

		await service.new(patientId, userId, parameters);

		assertSpyCall(userSpy, 0, { args: [ID.New(userId)] });
		assertSpyCalls(userSpy, 1);
	});
	await t.step("Deve salvar a ronda de exames do paciente no repositório.", async () => {
		const parameters = {
			heartRate: {
				name: "heartRate",
				value: 78,
			},
		};
		const { service, roundRepository } = makeService();
		const roundSpy = spy(roundRepository, "save");

		await service.new(patientId, userId, parameters);

		assertSpyCall(roundSpy, 0);
		assertSpyCalls(roundSpy, 1);

		const round = await roundRepository.last();
		const patient = round.getPatient();
		assertEquals(patient.patientId.toString(), patientId);
	});
	await t.step(
		"Deve adicionar o parâmetro da Frequência cardiaca a ronda de exames",
		async () => {
			const parameters = {
				heartRate: {
					name: "heartRate",
					value: 78,
				},
			};
			const { service, roundRepository } = makeService();

			await service.new(patientId, userId, parameters);

			const round = await roundRepository.last();
			const heartRate = round.getParameter("heartRate");

			assertEquals(round.totalParameters(), 1);
			assertEquals(heartRate?.name, "heartRate");
			assertEquals(heartRate?.getValue(), 78);
		},
	);

	await t.step("Deve registar o parametro da Frequência respiratória", async () => {
		const parameters = {
			respiratoryRate: {
				name: "respiratoryRate",
				value: 20,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const respiratoryRate = round.getParameter("respiratoryRate");
		assertEquals(round.totalParameters(), 1);
		assertEquals(respiratoryRate?.name, "respiratoryRate");
		assertEquals(respiratoryRate?.getValue(), 20);
	});

	await t.step("Deve registar o parametro Trc", async () => {
		const parameters = {
			trc: {
				name: "trc",
				value: 2,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const trc = round.getParameter("trc");
		assertEquals(round.totalParameters(), 1);
		assertEquals(trc?.name, "trc");
		assertEquals(trc?.getValue(), 2);
	});

	await t.step("Deve registar o parametro Avdn", async () => {
		const parameters = {
			avdn: {
				name: "avdn",
				value: "Alerta",
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const avdn = round.getParameter("avdn");
		assertEquals(round.totalParameters(), 1);
		assertEquals(avdn?.name, "avdn");
		assertEquals(avdn?.getValue(), "Alerta");
	});

	await t.step("Deve registar o parametro mucosas", async () => {
		const parameters = {
			mucosas: {
				name: "mucosas",
				value: "Rosadas",
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const mucosas = round.getParameter("mucosas");
		assertEquals(round.totalParameters(), 1);
		assertEquals(mucosas?.name, "mucosas");
		assertEquals(mucosas?.getValue(), "Rosadas");
	});

	await t.step("Deve registar o parametro da Temperatura", async () => {
		const parameters = {
			temperature: {
				name: "temperature",
				value: 37.5,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const temperature = round.getParameter("temperature");
		assertEquals(round.totalParameters(), 1);
		assertEquals(temperature?.name, "temperature");
		assertEquals(temperature?.getValue(), 37.5);
	});

	await t.step("Deve registar o parametro glicemia", async () => {
		const parameters = {
			bloodGlucose: {
				name: "bloodGlucose",
				value: 100,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const bloodGlucose = round.getParameter("bloodGlucose");
		assertEquals(round.totalParameters(), 1);
		assertEquals(bloodGlucose?.name, "bloodGlucose");
		assertEquals(bloodGlucose?.getValue(), 100);
	});

	await t.step("Deve registar o parametro Hct", async () => {
		const parameters = {
			hct: {
				name: "hct",
				value: 40,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const hct = round.getParameter("hct");
		assertEquals(round.totalParameters(), 1);
		assertEquals(hct?.name, "hct");
		assertEquals(hct?.getValue(), 40);
	});

	await t.step("Deve registar o parametro da Pressão arterial", async () => {
		const parameters = {
			bloodPressure: {
				name: "bloodPressure",
				value: "120/80 (56)",
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, userId, parameters);

		const round = await roundRepository.last();
		const bloodPressure = round.getParameter("bloodPressure");
		assertEquals(round.totalParameters(), 1);
		assertEquals(bloodPressure?.name, "bloodPressure");
		assertEquals(bloodPressure?.getValue(), "120/80 (56)");
	});
});

Deno.test("Round Service - Latest Measurements", async (t) => {
	await t.step("Deve retornar as ultimas medições do paciente", async () => {
		const { service } = makeService();
		const parameters = await service.latestMeasurements(patientId);
		assertEquals(parameters.length, 0);
	});
});

Deno.test("Round Service - Errors", async (t) => {
	await t.step("Deve retornar @PatientNofFoundError se o paciente não existir", async () => {
		const parameters = {
			heartRate: {
				name: "heartRate",
				value: 78,
			},
		};
		const { service } = makeService({ patientRepository: new InmemPatientRepository() });
		const error = await service.new(patientId, userId, parameters);

		assertEquals(error.isLeft(), true);
	});
});

const patientId = "some-id";
const userId = "some-user-id";

interface options {
	roundRepository?: RoundRepository;
	patientRepository?: PatientRepository;
}

function makeService(options?: options) {
	const roundRepository = options?.roundRepository ?? new InmemRoundRepository();
	const patientRepository = options?.patientRepository ?? new PatientRepositoryStub();
	const userRepository = new UserRepositoryStub();
	const service = new RoundService(roundRepository, patientRepository, userRepository);
	return { service, patientRepository, userRepository, roundRepository };
}
