import { Budget } from "domain/budget/budget.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { RepeatEvery } from "domain/hospitalization/alerts/repeat_every.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { Patient } from "domain/patient/patient.ts";
import { ID } from "shared/id.ts";

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

export const hospitalizationData = {
	entryDate: "2021-01-01",
	dischargeDate: new Date().toISOString(),
	weight: 16.5,
	birthDate: "2013-07-01",
	complaints: ["Queixa 1", "Queixa 2"],
	diagnostics: ["Diagnostico 1"],
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

export const hospitalizationClosed = new Hospitalization(
	ID.random(),
	"1918BA",
	45,
	["Queixa 1"],
	["Diagnostico 1"],
	"2024-04-10",
);

hospitalizationClosed.close();

const patientDischarged = new Patient(
	ID.fromString("1923BA"),
	ID.random().value,
	patientData.name,
	patientData.specie,
	patientData.breed,
	patientData.birthDate,
	patientData.ownerId,
);

const patientDischarged1 = new Patient(
	ID.fromString("1924BA"),
	ID.fromString("some-id-11").value,
	patientData.name,
	patientData.specie,
	patientData.breed,
	patientData.birthDate,
	patientData.ownerId,
);

const patientDischarged2 = new Patient(
	ID.fromString("1925BA"),
	ID.random().value,
	patientData.name,
	patientData.specie,
	patientData.breed,
	patientData.birthDate,
	patientData.ownerId,
);

const patientDischarged3 = new Patient(
	ID.fromString("1926BA"),
	ID.random().value,
	patientData.name,
	patientData.specie,
	patientData.breed,
	patientData.birthDate,
	patientData.ownerId,
);

const patientDischarged4 = new Patient(
	ID.fromString("1927BA"),
	ID.random().value,
	patientData.name,
	patientData.specie,
	patientData.breed,
	patientData.birthDate,
	patientData.ownerId,
);

const patientDischarged5 = new Patient(
	ID.fromString("1928BA"),
	ID.random().value,
	patientData.name,
	patientData.specie,
	patientData.breed,
	patientData.birthDate,
	patientData.ownerId,
);

patientDischarged.discharge();
patientDischarged1.dischargeWithUnpaidBudget();
patientDischarged2.discharge();
patientDischarged3.dischargeWithUnpaidBudget();
patientDischarged4.dischargeWithPendingBudget();
patientDischarged5.dischargeWithBudgetSent();

export const PATIENTS = {
	hospitalized: {
		["1918BA"]: new Patient(
			ID.fromString("1918BA"),
			ID.random().value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1919BA"]: new Patient(
			ID.fromString("1919BA"),
			ID.fromString("some-id").value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1920BA"]: new Patient(
			ID.fromString("1920BA"),
			ID.random().value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1921BA"]: new Patient(
			ID.fromString("1921BA"),
			ID.random().value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1922BA"]: new Patient(
			ID.fromString("1922BA"),
			ID.random().value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1900BA"]: new Patient(
			ID.fromString("1900BA"),
			ID.fromString("some-id-10").value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1901BA"]: new Patient(
			ID.fromString("1901BA"),
			ID.fromString("some-id-11").value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1902BA"]: new Patient(
			ID.fromString("1902BA"),
			ID.fromString("some-id-12").value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1903BA"]: new Patient(
			ID.fromString("1903BA"),
			ID.fromString("some-id-13").value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
		["1904BA"]: new Patient(
			ID.fromString("1904BA"),
			ID.fromString("some-id-14").value,
			patientData.name,
			patientData.specie,
			patientData.breed,
			patientData.birthDate,
			patientData.ownerId,
		),
	},

	discharged: {
		"1923BA": { id: "1923BA", patient: patientDischarged },
		"1924BA": { id: "1924BA", patient: patientDischarged1 },
		"1925BA": { id: "1925BA", patient: patientDischarged2 },
		"1926BA": { id: "1926BA", patient: patientDischarged3 },
		"1927BA": { id: "1927BA", patient: patientDischarged4 },
		"1928BA": { id: "1928BA", patient: patientDischarged5 },
	},
};

export const HOSPITALIZATIONS = {
	opened: {
		[ID.fromString("0001").value]: new Hospitalization(
			ID.fromString("0001"),
			"1918BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		[ID.fromString("0002").value]: new Hospitalization(
			ID.fromString("0002"),
			"1919BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		[ID.fromString("0003").value]: new Hospitalization(
			ID.fromString("0003"),
			"1920BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		[ID.fromString("0004").value]: new Hospitalization(
			ID.fromString("0004"),
			"1921BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		[ID.fromString("0005").value]: new Hospitalization(
			ID.fromString("0005"),
			"1922BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		["0006"]: new Hospitalization(
			ID.fromString("0006"),
			"1924BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		["0007"]: new Hospitalization(
			ID.fromString("0007"),
			"1901BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		["0008"]: new Hospitalization(
			ID.fromString("0008"),
			"1902BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
		["0009"]: new Hospitalization(
			ID.fromString("0009"),
			"1903BA",
			hospitalizationData.weight,
			hospitalizationData.complaints,
			hospitalizationData.diagnostics,
			hospitalizationData.entryDate,
			hospitalizationData.dischargeDate,
		),
	},
	closed: {
		"1923BA": hospitalizationClosed,
	},
};

export const BUDGETS = [
	new Budget(ID.random(), ID.fromString("0001"), "2024-04-10", "2024-04-20", "NÃO PAGO"),
	new Budget(ID.random(), ID.fromString("0002"), "2024-04-10", "2024-04-20", "NÃO PAGO"),
	new Budget(ID.random(), ID.fromString("0003"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(
		ID.random(),
		ID.fromString("0004"),
		"2024-04-10",
		"2024-04-20",
		"PENDENTE (ORÇAMENTO ENVIADO)",
	),
	new Budget(ID.random(), ID.fromString("0005"), "2024-04-10", "2024-04-20", "PAGO"),
	new Budget(ID.random(), ID.fromString("0006"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(ID.random(), ID.fromString("0007"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(ID.random(), ID.fromString("0008"), "2024-04-10", "2024-04-20", "PENDENTE"),
	new Budget(ID.random(), ID.fromString("0009"), "2024-04-10", "2024-04-20", "PENDENTE"),
];
