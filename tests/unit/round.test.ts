import { assertEquals, assertInstanceOf } from "dev_deps";
import { Round } from "domain/rounds/round.ts";
import { Patient } from "domain/patients/patient.ts";
import { HeartRate } from "domain/parameters/heart_rate.ts";
import { RespiratoryRate } from "domain/parameters/respiratore_rate.ts";
import { Trc } from "domain/parameters/trc.ts";
import { Avdn } from "domain/parameters/avdn.ts";
import { Mucosas } from "domain/parameters/mucosas.ts";
import { BloodGlucose } from "domain/parameters/blood_glucose.ts";
import { Hct } from "domain/parameters/hct.ts";
import { BloodPressure } from "domain/parameters/blood_pressure.ts";
import { Temperature } from "domain/parameters/temperature.ts";
import { owner } from "../fake_data.ts";
import { ID } from "shared/id.ts";
import { Species } from "domain/patients/patient.ts";

Deno.test("Rounds", async (t) => {
	await t.step("Deve criar uma ronda.", () => {
		const round = new Round(patient.patientId);
		assertEquals(round.patientId, patient.patientId);
	});
	await t.step(
		"Deve criar a ronda com a medição da Frequência cardiaca.",
		() => {
			const parameter = new HeartRate(78);
			const round = new Round(patient.patientId);

			round.addParameter(parameter);

			const heartRate = round.getParameter("heartRate")!;

			assertEquals(round.totalParameters(), 1);
			assertInstanceOf(heartRate, HeartRate);
		},
	);
	await t.step(
		"Deve criar uma ronda com a medição da Frequência respiratória.",
		() => {
			const heartRate = new HeartRate(78);
			const parameter = new RespiratoryRate(12);
			const round = new Round(patient.patientId);

			round.addParameter(heartRate);
			round.addParameter(parameter);

			const respiratoryRate = round.getParameter("respiratoryRate")!;
			assertEquals(round.totalParameters(), 2);
			assertInstanceOf(respiratoryRate, RespiratoryRate);
		},
	);
	await t.step("Deve criar uma ronda com a medição da Trc.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const parameter = new Trc("Maior que 2'");
		const round = new Round(patient.patientId);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(parameter);

		const trc = round.getParameter("trc")!;
		assertEquals(round.totalParameters(), 3);
		assertInstanceOf(trc, Trc);
	});
	await t.step("Deve criar uma ronda com a medição da Avdn.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const trc = new Trc("Maior que 2'");
		const parameter = new Avdn("Alerta");

		const round = new Round(patient.patientId);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(trc);
		round.addParameter(parameter);

		const avdn = round.getParameter("avdn")!;
		assertEquals(round.totalParameters(), 4);
		assertInstanceOf(avdn, Avdn);
	});
	await t.step("Deve criar uma ronda com a medição da Mucosas.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const trc = new Trc("Maior que 2'");
		const avdn = new Avdn("Alerta");
		const parameter = new Mucosas("Rosadas");

		const round = new Round(patient.patientId);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(trc);
		round.addParameter(avdn);
		round.addParameter(parameter);

		const mucosas = round.getParameter("mucosas")!;
		assertEquals(round.totalParameters(), 5);
		assertInstanceOf(mucosas, Mucosas);
	});
	await t.step("Deve criar uma ronda com a medição da Temperatura.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const trc = new Trc("Maior que 2'");
		const avdn = new Avdn("Alerta");
		const mucosas = new Mucosas("Rosadas");
		const parameter = new Temperature(38);

		const round = new Round(patient.patientId);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(trc);
		round.addParameter(avdn);
		round.addParameter(mucosas);
		round.addParameter(parameter);
		const temperature = round.getParameter("mucosas")!;
		assertEquals(round.totalParameters(), 6);
		assertInstanceOf(temperature, Mucosas);
	});
	await t.step("Deve criar uma ronda com a medição da Glicemia.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const trc = new Trc("Maior que 2'");
		const avdn = new Avdn("Alerta");
		const mucosas = new Mucosas("Rosadas");
		const temperature = new Temperature(38);
		const parameter = new BloodGlucose(67);

		const round = new Round(patient.patientId);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(trc);
		round.addParameter(avdn);
		round.addParameter(mucosas);
		round.addParameter(temperature);
		round.addParameter(parameter);

		const glicemia = round.getParameter("bloodGlucose")!;
		assertEquals(round.totalParameters(), 7);
		assertInstanceOf(glicemia, BloodGlucose);
	});
	await t.step("Deve criar uma ronda com a medição da Hct.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const trc = new Trc("Maior que 2'");
		const avdn = new Avdn("Alerta");
		const mucosas = new Mucosas("Rosadas");
		const temperature = new Temperature(38);
		const glicemia = new BloodGlucose(67);
		const parameter = new Hct(40);

		const round = new Round(patient.patientId);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(trc);
		round.addParameter(avdn);
		round.addParameter(mucosas);
		round.addParameter(temperature);
		round.addParameter(glicemia);
		round.addParameter(parameter);

		const hct = round.getParameter("hct")!;
		assertEquals(round.totalParameters(), 8);
		assertInstanceOf(hct, Hct);
	});
	await t.step(
		"Deve criar uma ronda com a medição da Pressão arterial.",
		() => {
			const heartRate = new HeartRate(78);
			const respiratoryRate = new RespiratoryRate(12);
			const trc = new Trc("Maior que 2'");
			const avdn = new Avdn("Alerta");
			const mucosas = new Mucosas("Rosadas");
			const temperature = new Temperature(38);
			const glicemia = new BloodGlucose(67);
			const hct = new Hct(40);
			const parameter = new BloodPressure("123/80(60)");

			const round = new Round(patient.patientId);

			round.addParameter(heartRate);
			round.addParameter(respiratoryRate);
			round.addParameter(trc);
			round.addParameter(avdn);
			round.addParameter(mucosas);
			round.addParameter(temperature);
			round.addParameter(glicemia);
			round.addParameter(hct);
			round.addParameter(parameter);

			const bloodPressure = round.getParameter("bloodPressure")!;
			assertEquals(round.totalParameters(), 9);
			assertInstanceOf(bloodPressure, BloodPressure);
		},
	);
});

const patientIdData = {
	patientIdId: "123",
	name: "Fulano",
	specie: "CANINO",
	breed: "SRD",
	birthDate: "2019-01-01",
};
const patient = new Patient(
	ID.random(),
	ID.fromString(patientIdData.patientIdId),
	patientIdData.name,
	patientIdData.breed,
	patientIdData.specie as Species,
	patientIdData.birthDate,
	owner,
);
