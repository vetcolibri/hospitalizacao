import { Alert } from "../domain/alerts/alert.ts";
import { Owner } from "../domain/patients/owner.ts";
import { Patient } from "../domain/patients/patient.ts";

export const patientData = {
	patientId: "some-id",
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
	budget: {
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

export const owner = new Owner("1001", "Jonh", "933001122");
export const patient1 = new Patient("some-patient-id", "Rex", "Bulldog", owner);
export const patient2 = new Patient("some-id", "Huston", "Pitbull", owner);
export const patient3 = new Patient("some-other-id", "Huston", "Pitbull", owner);
export const patient4 = new Patient("some-dummy-id", "Huston 1", "Pitbull", owner);
export const alert1 = Alert.create(
	patient1,
	["heartRate", "bloodPressure", "glicemia"],
	120,
	"dummy",
	new Date().toLocaleDateString(),
);
patient1.hospitalize(hospitalizationData);
patient2.hospitalize(hospitalizationData);
patient4.hospitalize(hospitalizationData);
patient4.nonHospitalized();
