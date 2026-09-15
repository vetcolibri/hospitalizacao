import { assertEquals, assertInstanceOf } from "dev_deps";
import { Role, User } from "domain/auth/user.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { RoundService } from "application/round_service.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemRoundRepository } from "persistence/inmem/inmem_round_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { PostgresHospitalizationRepository } from "persistence/postgres/postgres_hospitalization_repository.ts";
import { MeasurementServiceStub } from "../stubs/measurement_service_stub.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";
import { ID } from "shared/id.ts";

const PATIENT_SYSTEM_ID = "1904BA";
const OPEN_HOSPITALIZATION_ID = "0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f";
const DISCHARGE_DATE = "2026-01-12T15:04:05.000Z";

const parameters = {
	heartRate: {
		name: "heartRate",
		value: 78,
	},
};

function openHospitalization(): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId: OPEN_HOSPITALIZATION_ID,
		patientId: PATIENT_SYSTEM_ID,
		weight: 12,
		complaints: ["Queixa 1"],
		diagnostics: ["Diagnostico 1"],
		entryDate: "2026-01-05T08:00:00.000Z",
		status: HospitalizationStatus.Open,
	});
}

Deno.test("Hospitalization Closure", async (t) => {
	await t.step("Deve definir dischargeDate ao encerrar.", () => {
		const hospitalization = openHospitalization();
		assertEquals(hospitalization.dischargeDate, undefined);

		hospitalization.close(new Date(DISCHARGE_DATE));

		assertEquals(hospitalization.isOpen(), false);
		assertEquals(hospitalization.dischargeDate?.toISOString(), DISCHARGE_DATE);
	});

	await t.step("Deve usar a data actual quando o encerramento não a fornece.", () => {
		const hospitalization = openHospitalization();
		hospitalization.close();
		assertInstanceOf(hospitalization.dischargeDate, Date);
	});

	await t.step(
		"O repositório Postgres deve persistir status e discharge_date no encerramento.",
		async () => {
			const queries = captureQueries();

			const hospitalization = openHospitalization();
			hospitalization.close(new Date(DISCHARGE_DATE));

			await new PostgresHospitalizationRepository(queries.client).update(hospitalization);

			const update = queries.captured[0];
			assertEquals(update.sql.trim().toUpperCase().startsWith("UPDATE"), true);
			assertEquals(update.sql.includes("discharge_date"), true);
			assertEquals(update.values.includes(HospitalizationStatus.Close), true);
			assertEquals(update.values.includes(DISCHARGE_DATE), true);
		},
	);

	await t.step("Encerrar não deve apagar a hospitalização nem as suas rondas.", async () => {
		const { service, roundRepository, hospitalizationRepository } = makeService([
			openHospitalization(),
		]);

		await service.new(PATIENT_SYSTEM_ID, parameters, "john.doe1234");

		const hospitalizationOrErr = await hospitalizationRepository.findByPatientId(
			ID.fromString(PATIENT_SYSTEM_ID),
		);
		assertEquals(hospitalizationOrErr.isRight(), true);
		if (hospitalizationOrErr.isLeft()) return;

		hospitalizationOrErr.value.close(new Date(DISCHARGE_DATE));
		await hospitalizationRepository.update(hospitalizationOrErr.value);

		assertEquals(hospitalizationRepository.records.length, 1);
		assertEquals(hospitalizationRepository.records[0].status, HospitalizationStatus.Close);
		assertEquals(
			hospitalizationRepository.records[0].dischargeDate?.toISOString(),
			DISCHARGE_DATE,
		);
		assertEquals(roundRepository.records.length, 1);
		assertEquals(roundRepository.records[0].hospitalizationId.value, OPEN_HOSPITALIZATION_ID);
	});
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
