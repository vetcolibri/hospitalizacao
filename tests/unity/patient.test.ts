import { assertEquals } from "../../dev_deps.ts";
import { PatientStatus, Species } from "../../domain/patients/patient.ts";
import { hospitalizationData, patient1 } from "../fake_data.ts";

Deno.test("Patient", async (t) => {
	await t.step("Deve hospitalizar um paciente", () => {
		patient1.hospitalize(hospitalizationData);

		assertEquals(patient1.name, "Rex");

		assertEquals(patient1.patientId.getValue(), "some-patient-id");

		assertEquals(patient1.getStatus(), PatientStatus.HOSPITALIZED);

		assertEquals(patient1.specie, Species.CANINE);

		assertEquals(patient1.birthDate.getYears(), 10);
	});
	await t.step("Deve recuperar o **entryDate** do paciente", () => {
		patient1.hospitalize(hospitalizationData);

		const hospitalization = patient1.activeHospitalization();

		assertEquals(hospitalization?.entryDate, new Date(hospitalizationData.entryDate));
	});
	await t.step("Deve recuperar o **dischargeDate** do paciente", () => {
		patient1.hospitalize(hospitalizationData);

		const hospitalization = patient1.activeHospitalization();

		assertEquals(hospitalization?.dischargeDate, new Date(hospitalizationData.dischargeDate));
	});
	await t.step("Deve recuperar o **budget** da Hospitalização", () => {
		patient1.hospitalize(hospitalizationData);

		const hospitalization = patient1.activeHospitalization();

		const budget = hospitalization!.activeBudget();

		assertEquals(hospitalization!.budgets.length, 1);

		assertEquals(
			budget.startOn,
			new Date(hospitalizationData.budgetData.startOn),
		);

		assertEquals(budget.isActive(), true);

		assertEquals(budget.endOn, new Date(hospitalizationData.budgetData.endOn));

		assertEquals(budget.status, hospitalizationData.budgetData.status);

		assertEquals(budget.status, "NÃO PAGO");

		assertEquals(budget.durationInDays, 9);
	});
	await t.step("Deve recuperar o **weight** do paciente", () => {
		patient1.hospitalize(hospitalizationData);

		const hospitalization = patient1.activeHospitalization();

		assertEquals(hospitalization?.weight, hospitalizationData.weight);
	});
	await t.step("Deve recuperar o **complaints** do paciente", () => {
		patient1.hospitalize(hospitalizationData);

		const hospitalization = patient1.activeHospitalization();

		assertEquals(hospitalization?.complaints, hospitalizationData.complaints);
	});
	await t.step("Deve recuperar o **diagnostics** do paciente", () => {
		patient1.hospitalize(hospitalizationData);

		const hospitalization = patient1.activeHospitalization();

		assertEquals(hospitalization?.diagnostics, hospitalizationData.diagnostics);
	});
});
