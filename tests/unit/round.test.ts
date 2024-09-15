import { assertEquals, assertInstanceOf } from "dev_deps";
import { Avdn } from "domain/hospitalization/parameters/avdn.ts";
import { BloodGlucose } from "domain/hospitalization/parameters/blood_glucose.ts";
import { BloodPressure } from "domain/hospitalization/parameters/blood_pressure.ts";
import { Hct } from "domain/hospitalization/parameters/hct.ts";
import { HeartRate } from "domain/hospitalization/parameters/heart_rate.ts";
import { Mucosas } from "domain/hospitalization/parameters/mucosas.ts";
import { RespiratoryRate } from "domain/hospitalization/parameters/respiratore_rate.ts";
import { Temperature } from "domain/hospitalization/parameters/temperature.ts";
import { Trc } from "domain/hospitalization/parameters/trc.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { Patient, Specie } from "domain/patient/patient.ts";
import { ID } from "shared/id.ts";

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

			round.add(parameter);

			const heartRate = round.get("heartRate")!;

			assertEquals(round.total(), 1);
			assertInstanceOf(heartRate, HeartRate);
		},
	);
	await t.step(
		"Deve criar uma ronda com a medição da Frequência respiratória.",
		() => {
			const heartRate = new HeartRate(78);
			const parameter = new RespiratoryRate(12);
			const round = new Round(patient.patientId);

			round.add(heartRate);
			round.add(parameter);

			const respiratoryRate = round.get("respiratoryRate")!;
			assertEquals(round.total(), 2);
			assertInstanceOf(respiratoryRate, RespiratoryRate);
		},
	);
	await t.step("Deve criar uma ronda com a medição da Trc.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const parameter = new Trc("Maior que 2'");
		const round = new Round(patient.patientId);

		round.add(heartRate);
		round.add(respiratoryRate);
		round.add(parameter);

		const trc = round.get("trc")!;
		assertEquals(round.total(), 3);
		assertInstanceOf(trc, Trc);
	});
	await t.step("Deve criar uma ronda com a medição da Avdn.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const trc = new Trc("Maior que 2'");
		const parameter = new Avdn("Alerta");

		const round = new Round(patient.patientId);

		round.add(heartRate);
		round.add(respiratoryRate);
		round.add(trc);
		round.add(parameter);

		const avdn = round.get("avdn")!;
		assertEquals(round.total(), 4);
		assertInstanceOf(avdn, Avdn);
	});
	await t.step("Deve criar uma ronda com a medição da Mucosas.", () => {
		const heartRate = new HeartRate(78);
		const respiratoryRate = new RespiratoryRate(12);
		const trc = new Trc("Maior que 2'");
		const avdn = new Avdn("Alerta");
		const parameter = new Mucosas("Rosadas");

		const round = new Round(patient.patientId);

		round.add(heartRate);
		round.add(respiratoryRate);
		round.add(trc);
		round.add(avdn);
		round.add(parameter);

		const mucosas = round.get("mucosas")!;
		assertEquals(round.total(), 5);
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

		round.add(heartRate);
		round.add(respiratoryRate);
		round.add(trc);
		round.add(avdn);
		round.add(mucosas);
		round.add(parameter);
		const temperature = round.get("mucosas")!;
		assertEquals(round.total(), 6);
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

		round.add(heartRate);
		round.add(respiratoryRate);
		round.add(trc);
		round.add(avdn);
		round.add(mucosas);
		round.add(temperature);
		round.add(parameter);

		const glicemia = round.get("bloodGlucose")!;
		assertEquals(round.total(), 7);
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

		round.add(heartRate);
		round.add(respiratoryRate);
		round.add(trc);
		round.add(avdn);
		round.add(mucosas);
		round.add(temperature);
		round.add(glicemia);
		round.add(parameter);

		const hct = round.get("hct")!;
		assertEquals(round.total(), 8);
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

			round.add(heartRate);
			round.add(respiratoryRate);
			round.add(trc);
			round.add(avdn);
			round.add(mucosas);
			round.add(temperature);
			round.add(glicemia);
			round.add(hct);
			round.add(parameter);

			const bloodPressure = round.get("bloodPressure")!;
			assertEquals(round.total(), 9);
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
	patientIdData.patientIdId,
	patientIdData.name,
	patientIdData.breed,
	patientIdData.specie as Specie,
	patientIdData.birthDate,
	"1001",
);
