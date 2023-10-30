import { assertEquals } from "../../dev_deps.ts";
import { Avdn } from "../../domain/parameters/avdn.ts";
import { BloodPressure } from "../../domain/parameters/blood_pressure.ts";
import { BloodGlucose } from "../../domain/parameters/blood_glucose.ts";
import { Hct } from "../../domain/parameters/hct.ts";
import { HeartRate } from "../../domain/parameters/heart_rate.ts";
import { Mucosas } from "../../domain/parameters/mucosas.ts";
import { RespiratoryRate } from "../../domain/parameters/respiratore_rate.ts";
import { Temperature } from "../../domain/parameters/temperature.ts";
import { Trc } from "../../domain/parameters/trc.ts";
import { User } from "../../domain/users/user.ts";

Deno.test("Parameters", async (t) => {
	await t.step("Deve criar o parâmtero Frequência cardiaca válido.", () => {
		const heartRate = new HeartRate(78, medVet);
		const valid = heartRate.isValid();
		assertEquals(valid, true);
		assertEquals(heartRate.getValue(), 78);
		assertEquals(heartRate.issuedAt.toLocaleDateString(), date);
		assertEquals(heartRate.user, medVet);
	});
	await t.step("Deve ser inválido a Frequência cardiaca acima de 300Bpm.", () => {
		const heartRate = new HeartRate(478, medVet);
		const valid = heartRate.isValid();
		assertEquals(valid, false);
	});
	await t.step("Deve criar o parâmtero Frequência respiratória válido.", () => {
		const respiratoryRate = new RespiratoryRate(23, medVet);
		const valid = respiratoryRate.isValid();
		assertEquals(valid, true);
		assertEquals(respiratoryRate.getValue(), 23);
		assertEquals(respiratoryRate.issuedAt.toLocaleDateString(), date);
		assertEquals(respiratoryRate.user, medVet);
	});
	await t.step("Deve ser inválido a Frequência respiratória acima de 100Rpm.", () => {
		const respiratoryRate = new RespiratoryRate(378, medVet);
		const valid = respiratoryRate.isValid();
		assertEquals(valid, false);
	});
	await t.step("Deve criar o parâmtero da Trc válido.", () => {
		const trc = new Trc(2, medVet);
		const valid = trc.isValid();
		assertEquals(valid, true);
		assertEquals(trc.getValue(), 2);
		assertEquals(trc.issuedAt.toLocaleDateString(), date);
		assertEquals(trc.user, medVet);
	});
	await t.step("Deve ser inválido o Trc acima de 2'.", () => {
		const trc = new Trc(59, medVet);
		const valid = trc.isValid();
		assertEquals(valid, false);
	});
	await t.step("Deve criar o parâmtero Avdn válido.", () => {
		const avdn = new Avdn("Alerta", medVet);
		const valid = avdn.isValid();
		assertEquals(valid, true);
		assertEquals(avdn.getValue(), "Alerta");
		assertEquals(avdn.issuedAt.toLocaleDateString(), date);
		assertEquals(avdn.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Avdn fora dos valores desejados.",
		() => {
			const avdn = new Avdn("Rosadas", medVet);
			const valid = avdn.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Mucosas válido.", () => {
		const mucosas = new Mucosas("Rosadas", medVet);
		const valid = mucosas.isValid();
		assertEquals(valid, true);
		assertEquals(mucosas.getValue(), "Rosadas");
		assertEquals(mucosas.issuedAt.toLocaleDateString(), date);
		assertEquals(mucosas.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Mucosas fora dos valores desejados.",
		() => {
			const mucosas = new Mucosas("Alerta", medVet);
			const valid = mucosas.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Temperatura válido.", () => {
		const tempeture = new Temperature(38, medVet);
		const valid = tempeture.isValid();
		assertEquals(valid, true);
		assertEquals(tempeture.getValue(), 38);
		assertEquals(tempeture.issuedAt.toLocaleDateString(), date);
		assertEquals(tempeture.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Temperatura acima de 100Cº.",
		() => {
			const tempeture = new Temperature(450, medVet);
			const valid = tempeture.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Glicemia válido.", () => {
		const glicemia = new BloodGlucose(68, medVet);
		const valid = glicemia.isValid();
		assertEquals(valid, true);
		assertEquals(glicemia.getValue(), 68);
		assertEquals(glicemia.issuedAt.toLocaleDateString(), date);
		assertEquals(glicemia.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Glicemia acima de 300mg/dl.",
		() => {
			const glicemia = new BloodGlucose(450, medVet);
			const valid = glicemia.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Hct válido.", () => {
		const hct = new Hct(40, medVet);
		const valid = hct.isValid();
		assertEquals(valid, true);
		assertEquals(hct.getValue(), 40);
		assertEquals(hct.issuedAt.toLocaleDateString(), date);
		assertEquals(hct.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Hct acima de 100%.",
		() => {
			const hct = new Hct(123, medVet);
			const valid = hct.isValid();
			assertEquals(valid, false);
		},
	);
	await t.step("Deve criar o parâmtero Pressão arterial válido.", () => {
		const bloodPressure = new BloodPressure("123/80(60)", medVet);
		const valid = bloodPressure.isValid();
		assertEquals(valid, true);
		assertEquals(bloodPressure.getValue(), "123/80(60)");
		assertEquals(bloodPressure.issuedAt.toLocaleDateString(), date);
		assertEquals(bloodPressure.user, medVet);
	});
	await t.step(
		"Deve ser inválido o Pressão arterial acima de 280/180(100).",
		() => {
			const bloodPressure = new BloodPressure("300/200(300)", medVet);
			const valid = bloodPressure.isValid();
			assertEquals(valid, false);
		},
	);
});

const medVet = new User("123");
const date = new Date().toLocaleDateString();
