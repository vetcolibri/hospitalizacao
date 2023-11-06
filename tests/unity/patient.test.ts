import { assertEquals } from "../../dev_deps.ts";
import { PatientSpecie, PatientStatus } from "../../domain/patients/patient.ts";
import { hospitalizationData, patient1 } from "../fake_data.ts";

Deno.test("Patient", async (t) => {
	await t.step("Deve hospitalizar um paciente", () => {
		patient1.hospitalize(hospitalizationData);
		assertEquals(patient1.name, "Rex");
		assertEquals(patient1.patientId.getValue(), "some-patient-id");
		assertEquals(patient1.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient1.specie, PatientSpecie.CANINE);
	});
	await t.step("Deve recuperar o **entryDate** do paciente", () => {
		patient1.hospitalize(hospitalizationData);
		const hospitalization = patient1.getActiveHospitalization();
		assertEquals(hospitalization?.entryDate, new Date(hospitalizationData.entryDate));
	});
	await t.step("Deve recuperar o **dischargeDate** do paciente", () => {
		patient1.hospitalize(hospitalizationData);
		const hospitalization = patient1.getActiveHospitalization();
		assertEquals(hospitalization?.dischargeDate, new Date(hospitalizationData.dischargeDate));
	});
	await t.step("Deve recuperar o **estimatedBudgetDate** do paciente", () => {
		patient1.hospitalize(hospitalizationData);
		const hospitalization = patient1.getActiveHospitalization();
		assertEquals(
			hospitalization?.estimatedBudgetDate,
			new Date(hospitalizationData.estimatedBudgetDate),
		);
	});
	await t.step("Deve recuperar o **weight** do paciente", () => {
		patient1.hospitalize(hospitalizationData);
		const hospitalization = patient1.getActiveHospitalization();
		assertEquals(hospitalization?.weight, hospitalizationData.weight);
	});
	await t.step("Deve recuperar o **age** do paciente", () => {
		patient1.hospitalize(hospitalizationData);
		const hospitalization = patient1.getActiveHospitalization();
		assertEquals(hospitalization?.birthDate.getYears(), 10);
	});
	await t.step("Deve recuperar o **complaints** do paciente", () => {
		patient1.hospitalize(hospitalizationData);
		const hospitalization = patient1.getActiveHospitalization();
		assertEquals(hospitalization?.complaints, hospitalizationData.complaints);
	});
	await t.step("Deve recuperar o **diagnostics** do paciente", () => {
		patient1.hospitalize(hospitalizationData);
		const hospitalization = patient1.getActiveHospitalization();
		assertEquals(hospitalization?.diagnostics, hospitalizationData.diagnostics);
	});
});
