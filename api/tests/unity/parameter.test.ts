import { assertEquals } from "../../dev_deps.ts";
import { Avdn } from "../../domain/parameters/avdn.ts";
import { BloodPressure } from "../../domain/parameters/blood_pressure.ts";
import { Glicemia } from "../../domain/parameters/glicemia.ts";
import { Hct } from "../../domain/parameters/hct.ts";
import { HeartRate } from "../../domain/parameters/heart_rate.ts";
import { Measurement } from "../../domain/parameters/measurement.ts";
import { Mucosas } from "../../domain/parameters/mucosas.ts";
import { RespiratoryRate } from "../../domain/parameters/respiratore_rate.ts";
import { Temperature } from "../../domain/parameters/temperature.ts";
import { Trc } from "../../domain/parameters/trc.ts";
import { User } from "../../domain/users/user.ts";

Deno.test("Parameters", async (t) => {
	await t.step("Deve criar o parâmtero Frequência cardiaca válido.", () => {
		const measurement = Measurement.new(78);
		const heartRate = new HeartRate(measurement, date, medVet);
		const valid = heartRate.isValid();
		assertEquals(valid, true);
		assertEquals(heartRate.getValue(), 78);
		assertEquals(heartRate.issuedAt.toISOString(), date);
		assertEquals(heartRate.user, medVet);
	});
	await t.step("Deve ser inválido a Frequência cardiaca acima de 300Bpm.", () => {
		const measurement = Measurement.new(378);
		const heartRate = new HeartRate(measurement, date, medVet);
		const valid = heartRate.isValid();
		assertEquals(valid, false);
	});
	await t.step("Deve criar o parâmtero Frequência respiratória válido.", () => {
		const respiratoryRate = new RespiratoryRate(23, date, medVet);
		const valid = respiratoryRate.isValid();
		assertEquals(valid, true);
		assertEquals(respiratoryRate.getValue(), 23);
		assertEquals(respiratoryRate.issuedAt.toISOString(), date);
		assertEquals(respiratoryRate.user, medVet);
	});
	await t.step("Deve ser inválido a Frequência respiratória acima de 100Rpm.", () => {
		const respiratoryRate = new RespiratoryRate(378, date, medVet);
		const valid = respiratoryRate.isValid();
		assertEquals(valid, false);
	});
	await t.step("Deve criar o parâmtero da Trc válido.", () => {
		const trc = new Trc(2, date, medVet);
		const valid = trc.isValid();
		assertEquals(valid, true);
		assertEquals(trc.getValue(), 2);
		assertEquals(trc.issuedAt.toISOString(), date);
		assertEquals(trc.user, medVet);
	});
	await t.step("Deve ser inválido o Trc acima de 2'.", () => {
		const trc = new Trc(59, date, medVet);
		const valid = trc.isValid();
		assertEquals(valid, false);
	});
	await t.step("Deve criar o parâmtero Avdn válido.", () => {
		const avdn = new Avdn("Alerta", date, medVet);
		const valid = avdn.isValid();
		assertEquals(valid, true);
		assertEquals(avdn.getValue(), "Alerta");
		assertEquals(avdn.issuedAt.toISOString(), date);
		assertEquals(avdn.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Avdn fora dos valores desejados.",
		() => {
			const avdn = new Avdn("Rosadas", date, medVet);
			const valid = avdn.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Mucosas válido.", () => {
		const mucosas = new Mucosas("Rosadas", date, medVet);
		const valid = mucosas.isValid();
		assertEquals(valid, true);
		assertEquals(mucosas.getValue(), "Rosadas");
		assertEquals(mucosas.issuedAt.toISOString(), date);
		assertEquals(mucosas.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Mucosas fora dos valores desejados.",
		() => {
			const mucosas = new Mucosas("Alerta", date, medVet);
			const valid = mucosas.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Temperatura válido.", () => {
		const tempeture = new Temperature(38, date, medVet);
		const valid = tempeture.isValid();
		assertEquals(valid, true);
		assertEquals(tempeture.getValue(), 38);
		assertEquals(tempeture.issuedAt.toISOString(), date);
		assertEquals(tempeture.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Temperatura acima de 100Cº.",
		() => {
			const tempeture = new Temperature(450, date, medVet);
			const valid = tempeture.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Glicemia válido.", () => {
		const glicemia = new Glicemia(68, date, medVet);
		const valid = glicemia.isValid();
		assertEquals(valid, true);
		assertEquals(glicemia.getValue(), 68);
		assertEquals(glicemia.issuedAt.toISOString(), date);
		assertEquals(glicemia.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Glicemia acima de 300mg/dl.",
		() => {
			const glicemia = new Glicemia(450, date, medVet);
			const valid = glicemia.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Hct válido.", () => {
		const hct = new Hct(40, date, medVet);
		const valid = hct.isValid();
		assertEquals(valid, true);
		assertEquals(hct.getValue(), 40);
		assertEquals(hct.issuedAt.toISOString(), date);
		assertEquals(hct.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Hct acima de 100%.",
		() => {
			const hct = new Hct(123, date, medVet);
			const valid = hct.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Pressão arterial válido.", () => {
		const bloodPressure = new BloodPressure("123/80(60)", date, medVet);
		const valid = bloodPressure.isValid();
		assertEquals(valid, true);
		assertEquals(bloodPressure.getValue(), "123/80(60)");
		assertEquals(bloodPressure.issuedAt.toISOString(), date);
		assertEquals(bloodPressure.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Pressão arterial acima de 280/180(100).",
		() => {
			const bloodPressure = new BloodPressure("300/200(300)", date, medVet);
			const valid = bloodPressure.isValid();
			assertEquals(valid, false);
		},
	);
});

const medVet = new User("123");
const date = "2023-09-30T11:54:33.651Z";
