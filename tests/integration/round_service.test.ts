import { RoundService } from "application/round_service.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";
import { assertEquals, assertInstanceOf, assertNotEquals } from "dev_deps";
import { InmemRoundRepository } from "persistence/inmem/inmem_round_repository.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { RoundRepository } from "../../src/domain/exams/rounds/round_repository.ts";
import { RoundRepositoryStub } from "../stubs/round_repository_stub.ts";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { Parameter } from "../../src/domain/exams/parameters/parameter.ts";
import { InvalidParameter } from "../../src/domain/exams/parameters/parameter_error.ts";
import { patient1 } from "../fake_data.ts";

Deno.test("Round Service - New Round", async (t) => {
	await t.step(
		"Deve salvar a ronda de exames do paciente no repositório.",
		async () => {
			const parameters = {
				heartRate: {
					name: "heartRate",
					value: 78,
				},
			};
			const { service, roundRepository } = makeService();

			await service.new(patientId, parameters);

			const round = await roundRepository.last();
			assertNotEquals(round.patientId.value, undefined);
		},
	);
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

			await service.new(patientId, parameters);

			const round = await roundRepository.last();
			const heartRate = round.getParameter("heartRate");

			assertEquals(round.totalParameters(), 1);
			assertEquals(heartRate?.name, "heartRate");
			assertEquals(heartRate?.value, 78);
		},
	);

	await t.step(
		"Deve registar o parametro da Frequência respiratória",
		async () => {
			const parameters = {
				respiratoryRate: {
					name: "respiratoryRate",
					value: 20,
				},
			};
			const { service, roundRepository } = makeService();

			await service.new(patientId, parameters);

			const round = await roundRepository.last();
			const respiratoryRate = round.getParameter("respiratoryRate");
			assertEquals(round.totalParameters(), 1);
			assertEquals(respiratoryRate?.name, "respiratoryRate");
			assertEquals(respiratoryRate?.value, 20);
		},
	);

	await t.step("Deve registar o parametro Trc", async () => {
		const parameters = {
			trc: {
				name: "trc",
				value: "Menor que 2'",
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, parameters);

		const round = await roundRepository.last();
		const trc = round.getParameter("trc");
		assertEquals(round.totalParameters(), 1);
		assertEquals(trc?.name, "trc");
		assertEquals(trc?.value, "Menor que 2'");
	});

	await t.step("Deve registar o parametro Avdn", async () => {
		const parameters = {
			avdn: {
				name: "avdn",
				value: "Alerta",
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, parameters);

		const round = await roundRepository.last();
		const avdn = round.getParameter("avdn");
		assertEquals(round.totalParameters(), 1);
		assertEquals(avdn?.name, "avdn");
		assertEquals(avdn?.value, "Alerta");
	});

	await t.step("Deve registar o parametro mucosas", async () => {
		const parameters = {
			mucosas: {
				name: "mucosas",
				value: "Rosadas",
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, parameters);

		const round = await roundRepository.last();
		const mucosas = round.getParameter("mucosas");
		assertEquals(round.totalParameters(), 1);
		assertEquals(mucosas?.name, "mucosas");
		assertEquals(mucosas?.value, "Rosadas");
	});

	await t.step("Deve registar o parametro da Temperatura", async () => {
		const parameters = {
			temperature: {
				name: "temperature",
				value: 37.5,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, parameters);

		const round = await roundRepository.last();
		const temperature = round.getParameter("temperature");
		assertEquals(round.totalParameters(), 1);
		assertEquals(temperature?.name, "temperature");
		assertEquals(temperature?.value, 37.5);
	});

	await t.step("Deve registar o parametro glicemia", async () => {
		const parameters = {
			bloodGlucose: {
				name: "bloodGlucose",
				value: 100,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, parameters);

		const round = await roundRepository.last();
		const bloodGlucose = round.getParameter("bloodGlucose");
		assertEquals(round.totalParameters(), 1);
		assertEquals(bloodGlucose?.name, "bloodGlucose");
		assertEquals(bloodGlucose?.value, 100);
	});

	await t.step("Deve registar o parametro Hct", async () => {
		const parameters = {
			hct: {
				name: "hct",
				value: 40,
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, parameters);

		const round = await roundRepository.last();
		const hct = round.getParameter("hct");
		assertEquals(round.totalParameters(), 1);
		assertEquals(hct?.name, "hct");
		assertEquals(hct?.value, 40);
	});

	await t.step("Deve registar o parametro da Pressão arterial", async () => {
		const parameters = {
			bloodPressure: {
				name: "bloodPressure",
				value: "120/80 (56)",
			},
		};
		const { service, roundRepository } = makeService();

		await service.new(patientId, parameters);

		const round = await roundRepository.last();
		const bloodPressure = round.getParameter("bloodPressure");
		assertEquals(round.totalParameters(), 1);
		assertEquals(bloodPressure?.name, "bloodPressure");
		assertEquals(bloodPressure?.value, "120/80 (56)");
	});
});

Deno.test("Round Service - Latest Measurements", async (t) => {
	await t.step("Deve retornar as ultimas medições do paciente", async () => {
		const roundRepository = new RoundRepositoryStub();
		const { service } = makeService({ roundRepository });

		const paramsOrErr = await service.latestMeasurements(patient1.systemId.value);

		const parameters = <Parameter[]> paramsOrErr.value;

		assertEquals(parameters.length, 2);
	});
});

Deno.test("Round Service - List Measurements", async (t) => {
	await t.step("Deve listar as medições.", async () => {
		const roundRepository = new RoundRepositoryStub();
		const { service } = makeService({ roundRepository });

		const paramsOrErr = await service.measurements(patient1.systemId.value);

		const parameters = <Parameter[]> paramsOrErr.value;

		assertEquals(parameters.length, 3);
	});
});

Deno.test("Round Service - Errors", async (t) => {
	await t.step(
		"Deve retornar @PatientNofFoundError se o paciente não existir.",
		async () => {
			const parameters = {
				heartRate: {
					name: "heartRate",
					value: 78,
				},
			};
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const error = await service.new(patientId, parameters);

			assertEquals(error.isLeft(), true);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se a frequência cardíaca for superior a 300.",
		async () => {
			const parameters = {
				heartRate: {
					name: "heartRate",
					value: 301,
				},
			};
			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se a frequência respiratória for superior a 100.",
		async () => {
			const parameters = {
				respiratoryRate: {
					name: "respiratoryRate",
					value: 101,
				},
			};
			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se o trc for superior a 10.",
		async () => {
			const parameters = {
				trc: {
					name: "trc",
					value: 11,
				},
			};
			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se a Avnd não for válida.",
		async () => {
			const parameters = {
				avdn: {
					name: "avdn",
					value: "some-avdn",
				},
			};

			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se mucosas não for válida.",
		async () => {
			const parameters = {
				mucosas: {
					name: "mucosas",
					value: "some-mucosas",
				},
			};

			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se a temperatura for superior a 45.",
		async () => {
			const parameters = {
				temperature: {
					name: "temperature",
					value: 146,
				},
			};

			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se a glicemia for superior a 300.",
		async () => {
			const parameters = {
				bloodGlucose: {
					name: "bloodGlucose",
					value: 1001,
				},
			};

			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se o hct for superior a 60.",
		async () => {
			const parameters = {
				hct: {
					name: "hct",
					value: 101,
				},
			};

			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @InvalidParameter se a pressão arterial não for válida.",
		async () => {
			const parameters = {
				bloodPressure: {
					name: "bloodPressure",
					value: "some-blood-pressure",
				},
			};

			const { service } = makeService();

			const error = await service.new(patient1.systemId.value, parameters);

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, InvalidParameter);
		},
	);

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não existir.",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const error = await service.measurements("some-patient-id");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);

	await t.step(
		"Deve retornar @PatientNotFound se o paciente não existir.",
		async () => {
			const patientRepository = new InmemPatientRepository();
			const { service } = makeService({ patientRepository });

			const error = await service.latestMeasurements("some-patient-id");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, PatientNotFound);
		},
	);
});

const patientId = patient1.systemId.value;

interface options {
	roundRepository?: RoundRepository;
	patientRepository?: PatientRepository;
}

function makeService(options?: options) {
	const roundRepository = options?.roundRepository ?? new InmemRoundRepository();
	const patientRepository = options?.patientRepository ?? new PatientRepositoryStub();

	const service = new RoundService(roundRepository, patientRepository);
	return { service, patientRepository, roundRepository };
}
