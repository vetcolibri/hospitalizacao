import { assertEquals } from "dev_deps";
import { Client } from "deps";
import { PostgresPatientRepository } from "persistence/postgres/postgres_patient_repository.ts";
import { PatientStatus } from "domain/patient/patient.ts";
import { ID } from "shared/id.ts";

function makeClient(rows: Record<string, string>[]) {
	const calls: { sql: string; values: Record<string, unknown> }[] = [];
	const client = {
		queryObject(sql: string, values: Record<string, unknown>) {
			calls.push({ sql, values });
			return Promise.resolve({ rows });
		},
	} as unknown as Client;

	return { client, calls };
}

Deno.test("patients are searched directly by the clinic ID", async () => {
	const { client, calls } = makeClient([{
		system_id: "sys-1",
		patient_id: "CVL-001",
		name: "Rex",
		breed: "bulldog",
		specie: "CANINO",
		birth_date: "2013-07-01",
		owner_id: "owner-1",
		status: PatientStatus.Discharged,
	}]);

	const result = await new PostgresPatientRepository(client).findByPatientId(
		ID.fromString("CVL-001"),
	);

	assertEquals(calls.length, 1, "Deve executar uma única consulta.");
	assertEquals(calls[0].sql.includes("WHERE patient_id = $PATIENT_ID"), true);
	assertEquals(calls[0].values, { patient_id: "CVL-001" });
	assertEquals(result.isRight(), true);
	assertEquals(result.value.systemId.value, "sys-1");
	assertEquals(result.value.patientId.value, "CVL-001");
});

Deno.test("non hospitalized patients include every discharge state", async () => {
	const { client, calls } = makeClient([]);

	await new PostgresPatientRepository(client).findNonHospitalized();

	assertEquals(calls.length, 1, "Deve executar uma única consulta.");
	assertEquals(calls[0].sql.includes("status <> $HOSPITALIZED"), true);
	assertEquals(calls[0].values, { hospitalized: PatientStatus.Hospitalized });
});
