import { Patient } from "domain/patients/patient.ts";
import { RepeatEvery } from "domain/alerts/repeat_every.ts";
import { Owner } from "../src/domain/patients/owners/owner.ts";
import { Alert } from "domain/alerts/alert.ts";
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
	entryDate: "2021-01-01",
	dischargeDate: new Date().toISOString(),
	weight: 16.5,
	birthDate: "2013-07-01",
	complaints: ["Queixa 1", "Queixa 2"],
	diagnostics: ["Diagnostico 1"],
};

export const budgetData = {
	startOn: "2021-01-01",
	endOn: "2021-01-10",
	status: "NÃO PAGO",
};

export const newPatientData = {
	patientData,
	hospitalizationData,
	ownerData,
	budgetData,
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
	"some-patient-id",
	patientData.name,
	patientData.breed,
	patientData.specie,
	patientData.birthDate,
	"1001",
);

export const patient2 = new Patient(
	ID.random(),
	"some-id",
	patientData.name,
	patientData.breed,
	patientData.specie,
	patientData.birthDate,
	"1001",
);

export const patient3 = new Patient(
	ID.fromString("1919B"),
	"some-other-id",
	patientData.name,
	patientData.breed,
	patientData.specie,
	patientData.birthDate,
	"1001",
);

patient3.discharge();

export const alert1 = new Alert(
	ID.fromString("10001"),
	patient1.systemId,
	alertData.parameters,
	new Date(alertData.time),
	new RepeatEvery(alertData.rate),
	alertData.comments,
);
