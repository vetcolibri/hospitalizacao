import { assertEquals } from "../../dev_deps.ts";
import {
	Hospitalization,
	Patient,
	PatientSpecie,
	PatientStatus,
} from "../../domain/patients/patient.ts";

Deno.test("Patient", async (t) => {
	await t.step("Deve hospitalizar um paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		const hosp = new Hospitalization(date);
		patient.hospitalize(hosp);
		assertEquals(patient.name, "Rex");
		assertEquals(patient.patientId.toString(), "PT - 1292/2023");
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.specie, PatientSpecie.CANINE);
	});
	await t.step("Deve recuperar a data de hospitalização do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		const hosp = new Hospitalization(date);
		patient.hospitalize(hosp);
		const activeHosp = patient.getActiveHospitalization();
		assertEquals(activeHosp?.issuedAt.toISOString(), date);
	});
});

const date = new Date().toISOString();
