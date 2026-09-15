import { RoundService } from "application/round_service.ts";
import { assertEquals, assertInstanceOf } from "dev_deps";
import { Role, User } from "domain/auth/user.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemRoundRepository } from "persistence/inmem/inmem_round_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { PostgresRoundRepository } from "persistence/postgres/postgres_round_repository.ts";
import { MeasurementServiceStub } from "../stubs/measurement_service_stub.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";
import { ID } from "shared/id.ts";

const PATIENT_SYSTEM_ID = "1904BA";
const OPEN_HOSPITALIZATION_ID = "0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f";
const CLOSED_HOSPITALIZATION_ID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const parameters = {
	heartRate: {
		name: "heartRate",
		value: 78,
	},
};

function buildHospitalization(
	hospitalizationId: string,
	status: HospitalizationStatus,
	entryDate: string,
	dischargeDate?: string,
): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId,
		patientId: PATIENT_SYSTEM_ID,
		weight: 12,
		complaints: ["Queixa 1"],
		diagnostics: ["Diagnostico 1"],
		entryDate,
		dischargeDate,
		status,
	});
}

function openHospitalization(): Hospitalization {
	return buildHospitalization(
		OPEN_HOSPITALIZATION_ID,
		HospitalizationStatus.Open,
		"2026-01-05T08:00:00.000Z",
	);
}

function closedHospitalization(): Hospitalization {
	return buildHospitalization(
		CLOSED_HOSPITALIZATION_ID,
		HospitalizationStatus.Close,
		"2025-01-05T08:00:00.000Z",
		"2025-01-09T10:00:00.000Z",
	);
}

Deno.test("Round Hospitalization Association", async (t) => {
	await t.step(
		"Deve associar a ronda nova à hospitalização aberta do paciente.",
		async () => {
			const { service, roundRepository } = makeService([openHospitalization()]);

			const result = await service.new(PATIENT_SYSTEM_ID, parameters, "john.doe1234");
			assertEquals(result.isLeft(), false, "a ronda deveria ser aceite");

			const round = await roundRepository.last();
			assertEquals(round.hospitalizationId.value, OPEN_HOSPITALIZATION_ID);
		},
	);

	await t.step(
		"Deve associar a ronda à hospitalização aberta e não a uma anterior do mesmo paciente.",
		async () => {
			const { service, roundRepository } = makeService([
				closedHospitalization(),
				openHospitalization(),
			]);

			await service.new(PATIENT_SYSTEM_ID, parameters, "john.doe1234");

			const round = await roundRepository.last();
			assertEquals(round.hospitalizationId.value, OPEN_HOSPITALIZATION_ID);
		},
	);

	await t.step(
		"Deve falhar sem gravar quando o paciente não tem hospitalização aberta.",
		async () => {
			const { service, roundRepository } = makeService([]);

			const result = await service.new(PATIENT_SYSTEM_ID, parameters, "john.doe1234");

			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, HospitalizationNotFound);
			assertEquals(
				roundRepository.records.length,
				0,
				"nenhuma ronda pode ser gravada às cegas",
			);
		},
	);

	await t.step("Deve exigir hospitalização ao construir uma ronda.", () => {
		const round = new Round(
			ID.fromString(PATIENT_SYSTEM_ID),
			ID.fromString(OPEN_HOSPITALIZATION_ID),
		);
		assertEquals(round.hospitalizationId.value, OPEN_HOSPITALIZATION_ID);
		assertEquals(round.patientId.value, PATIENT_SYSTEM_ID);
	});

	await t.step(
		"O repositório Postgres de rondas deve persistir hospitalization_id.",
		async () => {
			const queries = captureQueries();

			const round = new Round(
				ID.fromString(PATIENT_SYSTEM_ID),
				ID.fromString(OPEN_HOSPITALIZATION_ID),
			);
			await new PostgresRoundRepository(queries.client).save(round);

			const insert = queries.captured[0];
			assertEquals(insert.sql.includes("hospitalization_id"), true);
			assertEquals(insert.values.includes(OPEN_HOSPITALIZATION_ID), true);
		},
	);
});

function captureQueries() {
	const captured: { sql: string; values: unknown[] }[] = [];
	const client = {
		queryObject(sql: string, params?: unknown) {
			return new Promise((resolve) => {
				const values = params === undefined
					? []
					: Array.isArray(params)
					? params
					: Object.values(params as Record<string, unknown>);
				captured.push({ sql, values });
				resolve({ rows: [] });
			});
		},
		// deno-lint-ignore no-explicit-any
	} as any;

	return { client, captured };
}

function makeService(hospitalizations: Hospitalization[]) {
	const roundRepository = new InmemRoundRepository();
	const hospitalizationRepository = new InmemHospitalizationRepository(hospitalizations);
	const userRepository = new InmemUserRepository([
		new User("john.doe1234", "john.doe1234", Role.MedVet),
	]);

	const service = new RoundService(
		roundRepository,
		new PatientRepositoryStub(),
		hospitalizationRepository,
		userRepository,
		new MeasurementServiceStub(),
	);

	return { service, roundRepository, hospitalizationRepository };
}
