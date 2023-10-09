import { assertEquals } from "../../dev_deps.ts";
import { Patient, PatientSpecie, PatientStatus } from "../../domain/patients/patient.ts";

Deno.test("Patient", async (t) => {
	await t.step("Deve criar um paciente", () => {
		const patient = new Patient("PT - 1292/2023");
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.specie, PatientSpecie.CANINE);
	});
});
