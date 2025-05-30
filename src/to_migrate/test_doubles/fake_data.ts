import { Alert } from "@domain/hospitalization/alerts/alert.ts";
import { RepeatEvery } from "@domain/hospitalization/alerts/repeat_every.ts";

import { ID } from "@shared/id.ts";

export const patientData = {
	patientId: "some-id",
	name: "Rex",
	specie: "CANINO",
	breed: "bulldog",
	birthDate: "2013-07-01",
	status: "HOSPITALIZADO",
	ownerId: "1001",
};

export const ownerData = {
	ownerId: "PR - 101002/2012",
	name: "Huston",
	phoneNumber: "933843893",
	whatsapp: true,
};

export const budgetData = {
	startOn: "2021-01-01T00:00:00.000Z",
	endOn: "2021-01-10T00:00:00.000Z",
	status: "NÃO PAGO",
};

export const newPatientData = {
	patientData,
	hospitalizationData,
	ownerData,
	budgetData,
	username: "john.doe1234",
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
export const owner = new Owner("1001", "John", "933001122", false);

export const alert1 = new Alert(
	ID.fromString("10001"),
	ID.fromString("1918BA"),
	alertData.parameters,
	new Date(alertData.time),
	new RepeatEvery(alertData.rate),
	alertData.comments,
);
