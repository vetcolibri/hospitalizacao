import { assertEquals } from "../../dev_deps.ts";
import { Patient, PatientSpecie, PatientStatus } from "../../domain/patients/patient.ts";

Deno.test("Patient", async (t) => {
	await t.step("Deve hospitalizar um paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		assertEquals(patient.name, "Rex");
		assertEquals(patient.patientId.toString(), "PT - 1292/2023");
		assertEquals(patient.getStatus(), PatientStatus.HOSPITALIZED);
		assertEquals(patient.specie, PatientSpecie.CANINE);
	});
	await t.step("Deve recuperar o **entryDate** do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		const hospitalization = patient.getActiveHospitalization();
		assertEquals(hospitalization?.entryDate, new Date(data.entryDate));
	});
	await t.step("Deve recuperar o **dischargeDate** do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		const hospitalization = patient.getActiveHospitalization();
		assertEquals(hospitalization?.dischargeDate, new Date(data.dischargeDate));
	});
	await t.step("Deve recuperar o **estimatedBudgetDate** do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		const hospitalization = patient.getActiveHospitalization();
		assertEquals(
			hospitalization?.estimatedBudgetDate,
			new Date(data.estimatedBudgetDate),
		);
	});
	await t.step("Deve recuperar o **weight** do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		const hospitalization = patient.getActiveHospitalization();
		assertEquals(hospitalization?.weight, data.weight);
	});
	await t.step("Deve recuperar o **age** do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		const hospitalization = patient.getActiveHospitalization();
		assertEquals(hospitalization?.age, data.age);
	});
	await t.step("Deve recuperar o **complaints** do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		const hospitalization = patient.getActiveHospitalization();
		assertEquals(hospitalization?.complaints, data.complaints);
	});
	await t.step("Deve recuperar o **diagnostics** do paciente", () => {
		const patient = new Patient("PT - 1292/2023", "Rex");
		patient.hospitalize(data);
		const hospitalization = patient.getActiveHospitalization();
		assertEquals(hospitalization?.diagnostics, data.diagnostics);
	});
});

const data = {
	entryDate: "2022-02-10",
	dischargeDate: "2022-02-10",
	estimatedBudgetDate: "2022-02-10",
	weight: 10.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};
