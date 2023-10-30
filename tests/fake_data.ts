import { Owner } from "../domain/patients/owner.ts";
import { Patient } from "../domain/patients/patient.ts";

export const patientData = {
	name: "Rex",
	specie: "CANINO",
	breed: "bulldog",
	ownerId: "PR - 101002/2012",
	ownerName: "Huston",
	phoneNumber: "933843893",
};

export const hospitalizationData = {
	entryDate: new Date().toLocaleDateString(),
	dischargeDate: new Date().toLocaleDateString(),
	estimatedBudgetDate: new Date().toLocaleDateString(),
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

export const invalidEntryDate = {
	entryDate: "2020-01-01",
	dischargeDate: new Date().toLocaleDateString(),
	estimatedBudgetDate: new Date().toLocaleDateString(),
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

export const invalidDischargeDate = {
	entryDate: new Date().toLocaleDateString(),
	dischargeDate: "2020-01-01",
	estimatedBudgetDate: new Date().toLocaleDateString(),
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

export const invalidEstimatedBudgetDate = {
	entryDate: new Date().toLocaleDateString(),
	dischargeDate: new Date().toLocaleDateString(),
	estimatedBudgetDate: "2020-01-01",
	weight: 16.5,
	age: 10,
	complaints: "Queixa 1",
	diagnostics: "Diagnostico 1",
};

export const newPatientData = {
	patientData,
	hospitalizationData,
};

export const owner = new Owner("1001", "Jonh", "933001122");
export const patient1 = new Patient("some-patient-id", "Rex", "Bulldog", owner);
export const patient2 = new Patient("some-id", "Huston", "Pitbull", owner);
export const patient3 = new Patient("some-other-id", "Huston", "Pitbull", owner);
export const patient4 = new Patient("some-dummy-id", "Huston 1", "Pitbull", owner);
patient1.hospitalize(hospitalizationData);
patient2.hospitalize(hospitalizationData);
patient4.hospitalize(hospitalizationData);
patient4.nonHospitalized();
