import { Alert } from "domain/alerts/alert.ts";
import { Owner } from "domain/patients/owner.ts";
import { Patient, Species } from "domain/patients/patient.ts";
import { ID } from "shared/id.ts";

export const patientData = {
	patientId: "some-id",
	name: "Rex",
	specie: "CANINO",
	breed: "bulldog",
	birthDate: "2013-07-01",
};

export const ownerData = {
	ownerId: "PR - 101002/2012",
	name: "Huston",
	phoneNumber: "933843893",
};

export const hospitalizationData = {
	entryDate: new Date().toISOString(),
	dischargeDate: new Date().toISOString(),
	budgetData: {
		startOn: "2021-01-01",
		endOn: "2021-01-10",
		status: "NÃO PAGO",
	},
	weight: 16.5,
	birthDate: "2013-07-01",
	complaints: ["Queixa 1", "Queixa 2"],
	diagnostics: ["Diagnostico 1"],
};

export const newPatientData = {
	patientData,
	hospitalizationData,
	ownerData,
};

export const patientWithSomeOwner = {
	patientData: {
		...patientData,
		patientId: "patient-with-same-owner-id",
	},
	hospitalizationData,
	ownerData: {
		...ownerData,
		ownerId: "1001",
	},
};

const alertData = {
	parameters: ["heartRate", "bloodPressure", "glicemia"],
	rate: 120,
	comments: "dummy",
	time: new Date().toISOString(),
};

const generateArrayString = (size: number) => {
	const array = [];
	for (let i = 0; i < size; i++) {
		array.push(`Some string ${i}`);
	}
	return array;
};

export const invalidComplaints = generateArrayString(11);
export const invalidDiagnostics = generateArrayString(6);

export const owner = new Owner("1001", "John", "933001122");

export const patient1 = new Patient(
	ID.random(),
	ID.fromString("some-patient-id"),
	patientData.name,
	patientData.breed,
	patientData.specie as Species,
	patientData.birthDate,
	owner,
);

export const patient2 = new Patient(
	ID.random(),
	ID.fromString("some-id"),
	patientData.name,
	patientData.breed,
	patientData.specie as Species,
	patientData.birthDate,
	owner,
);
export const patient3 = new Patient(
	ID.random(),
	ID.fromString("some-other-id"),
	patientData.name,
	patientData.breed,
	patientData.specie as Species,
	patientData.birthDate,
	owner,
);
export const patient4 = new Patient(
	ID.random(),
	ID.fromString("some-dummy-id"),
	patientData.name,
	patientData.breed,
	patientData.specie as Species,
	patientData.birthDate,
	owner,
);

export const alert1 = Alert.create(patient1, alertData);
patient1.hospitalize(hospitalizationData);
patient2.hospitalize(hospitalizationData);
patient4.hospitalize(hospitalizationData);
patient4.discharge();
