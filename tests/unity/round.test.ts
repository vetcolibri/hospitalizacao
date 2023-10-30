import { assertEquals, assertInstanceOf } from "../../dev_deps.ts";
import { Round } from "../../domain/rounds/round.ts";
import { Patient } from "../../domain/patients/patient.ts";
import { User } from "../../domain/users/user.ts";
import { HeartRate } from "../../domain/parameters/heart_rate.ts";
import { RespiratoryRate } from "../../domain/parameters/respiratore_rate.ts";
import { Trc } from "../../domain/parameters/trc.ts";
import { Avdn } from "../../domain/parameters/avdn.ts";
import { Mucosas } from "../../domain/parameters/mucosas.ts";
import { BloodGlucose } from "../../domain/parameters/blood_glucose.ts";
import { Hct } from "../../domain/parameters/hct.ts";
import { BloodPressure } from "../../domain/parameters/blood_pressure.ts";
import { Temperature } from "../../domain/parameters/temperature.ts";
import { owner } from "../fake_data.ts";

Deno.test("Rounds", async (t) => {
	await t.step("Deve criar uma ronda.", () => {
		const round = new Round(patient);
		assertEquals(round.patient, patient);
	});
	await t.step(
		"Deve criar a ronda com a medição da Frequência cardiaca.",
		() => {
			const parameter = new HeartRate(78, date, medVet);
			const round = new Round(patient);

			round.addParameter(parameter);

			const heartRate = round.getParameter("heartRate")!;

			assertEquals(round.totalParameters(), 1);
			assertInstanceOf(heartRate, HeartRate);
		},
	);
	await t.step("Deve criar uma ronda com a medição da Frequência respiratória.", () => {
		const heartRate = new HeartRate(78, date, medVet);
		const parameter = new RespiratoryRate(12, date, medVet);
		const round = new Round(patient);

		round.addParameter(heartRate);
		round.addParameter(parameter);

		const respiratoryRate = round.getParameter("respiratoryRate")!;
		assertEquals(round.totalParameters(), 2);
		assertInstanceOf(respiratoryRate, RespiratoryRate);
	});
	await t.step("Deve criar uma ronda com a medição da Trc.", () => {
		const heartRate = new HeartRate(78, date, medVet);
		const respiratoryRate = new RespiratoryRate(12, date, medVet);
		const parameter = new Trc(2, date, medVet);
		const round = new Round(patient);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(parameter);

		const trc = round.getParameter("trc")!;
		assertEquals(round.totalParameters(), 3);
		assertInstanceOf(trc, Trc);
	});
	await t.step("Deve criar uma ronda com a medição da Avdn.", () => {
		const heartRate = new HeartRate(78, date, medVet);
		const respiratoryRate = new RespiratoryRate(12, date, medVet);
		const trc = new Trc(1, date, medVet);
		const parameter = new Avdn("Alerta", date, medVet);

		const round = new Round(patient);

		round.addParameter(heartRate);
		round.addParameter(respiratoryRate);
		round.addParameter(trc);
		round.addParameter(parameter);

		const avdn = round.getParameter("avdn")!;
		assertEquals(round.totalParameters(), 4);
		assertInstanceOf(avdn, Avdn);
	});
	await t.step("Deve criar uma ronda com a medição da Mucosas.", () => {
		const heartRate = new HeartRate(78, date, medVet);
		const respiratoryRate = new RespiratoryRate(12, date, medVet);
		const trc = new Trc(1, date, medVet);
		const avdn = new Avdn("Alerta", date, medVet);
		const parameter = new Mucosas("Rosadas", date, medVet);

		const round = new Round(patient);

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
		const heartRate = new HeartRate(78, date, medVet);
		const respiratoryRate = new RespiratoryRate(12, date, medVet);
		const trc = new Trc(1, date, medVet);
		const avdn = new Avdn("Alerta", date, medVet);
		const mucosas = new Mucosas("Rosadas", date, medVet);
		const parameter = new Temperature(38, date, medVet);

		const round = new Round(patient);

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
		const heartRate = new HeartRate(78, date, medVet);
		const respiratoryRate = new RespiratoryRate(12, date, medVet);
		const trc = new Trc(1, date, medVet);
		const avdn = new Avdn("Alerta", date, medVet);
		const mucosas = new Mucosas("Rosadas", date, medVet);
		const temperature = new Temperature(38, date, medVet);
		const parameter = new BloodGlucose(67, date, medVet);

		const round = new Round(patient);

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
		const heartRate = new HeartRate(78, date, medVet);
		const respiratoryRate = new RespiratoryRate(12, date, medVet);
		const trc = new Trc(1, date, medVet);
		const avdn = new Avdn("Alerta", date, medVet);
		const mucosas = new Mucosas("Rosadas", date, medVet);
		const temperature = new Temperature(38, date, medVet);
		const glicemia = new BloodGlucose(67, date, medVet);
		const parameter = new Hct(40, date, medVet);

		const round = new Round(patient);

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
	await t.step("Deve criar uma ronda com a medição da Pressão arterial.", () => {
		const heartRate = new HeartRate(78, date, medVet);
		const respiratoryRate = new RespiratoryRate(12, date, medVet);
		const trc = new Trc(1, date, medVet);
		const avdn = new Avdn("Alerta", date, medVet);
		const mucosas = new Mucosas("Rosadas", date, medVet);
		const temperature = new Temperature(38, date, medVet);
		const glicemia = new BloodGlucose(67, date, medVet);
		const hct = new Hct(40, date, medVet);
		const parameter = new BloodPressure("123/80(60)", date, medVet);

		const round = new Round(patient);

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
	});
});

const medVet = new User("123");
const date = "2023-09-30T11:54:33.651Z";
const patient = new Patient("some-id", "Rex", "Bulldog", owner);
