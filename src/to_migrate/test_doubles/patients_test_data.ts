import { Patient, PatientStatus } from "@domain/patient/patient.ts";
import { ID } from "@shared/id.ts";
import { BirthDate } from "@domain/patient/birth_date.ts";

function buildPatient(
	patientId: string,
	name: string,
	specie: string,
	breed: string,
	birthDate: string,
	ownerId: string,
	status = PatientStatus.Hospitalized,
): Patient {
	return Patient.builder()
		.withPatientId(ID.fromString(patientId))
		.withSystemId(ID.random())
		.withOwnerId(ID.fromString(ownerId))
		.withName(name)
		.withSpecie(specie)
		.withBreed(breed)
		.withBirthDate(new BirthDate(birthDate))
		.withStatus(status)
		.build().right;
}

const patientData = {
	patientId: "some-id",
	name: "Rex",
	specie: "CANINO",
	breed: "bulldog",
	birthDate: "2013-07-01",
	status: "HOSPITALIZADO",
};

export const DISCHARGED_PATIENTS = [
	buildPatient(
		"1923BA",
		"Bobbi",
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101003/2012",
	),

	buildPatient(
		"1924BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101001/2012",
	),

	buildPatient(
		"1925BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101001/2012",
	),

	buildPatient(
		"1926BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101002/2012",
	),

	buildPatient(
		"1927BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101001/2012",
	),

	buildPatient(
		"1928BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101002/2012",
	),
];

DISCHARGED_PATIENTS.forEach((patient) => patient.discharge());

export const HOSPITALIZED_PATIENTS = [
	buildPatient(
		"1918BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101002/2012",
	),
	buildPatient(
		"1919BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101001/2012",
	),
	buildPatient(
		"1920BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101002/2012",
	),
	buildPatient(
		"1921BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101001/2012",
	),
	buildPatient(
		"1922BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101003/2012",
	),
	buildPatient(
		"1900BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101001/2012",
	),
	buildPatient(
		"1901BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101001/2012",
	),
	buildPatient(
		"1902BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101003/2012",
	),
	buildPatient(
		"1903BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101003/2012",
	),
	buildPatient(
		"1904BA",
		patientData.name,
		patientData.specie,
		patientData.breed,
		patientData.birthDate,
		"PR - 101003/2012",
	),
];

export function getPatient(patientId: string) {
	return PATIENTS.find((patient) => patient.patientId.value === patientId)!;
}

export const PATIENTS = [
	...HOSPITALIZED_PATIENTS,
	...DISCHARGED_PATIENTS,
];
