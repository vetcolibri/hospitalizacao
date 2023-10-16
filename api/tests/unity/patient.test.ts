import { assertEquals } from "../../dev_deps.ts";
import { Patient, PatientSpecie, PatientStatus } from "../../domain/patients/patient.ts";

Deno.test("Patient", async (t) => {
	await t.step("Deve hospitalizar um paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(entryDate, dischargeDate, estimatedBudgetDate);
		assertEquals(patient.name, "Rex");
		assertEquals(patient.patientId.toString(), "PT - 1292/2023");
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.specie, PatientSpecie.CANINE);
	});
	await t.step("Deve recuperar a data de hospitalização do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(entryDate, dischargeDate, estimatedBudgetDate);
		const activeHosp = patient.getActiveHospitalization();
		assertEquals(activeHosp?.entryDate.toISOString(), entryDate);
		assertEquals(activeHosp?.dischargeDate.toISOString(), dischargeDate);
	});
});

const entryDate = new Date().toISOString();
const dischargeDate = new Date().toISOString();
const estimatedBudgetDate = new Date().toISOString();
