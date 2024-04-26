import { SQLiteRoundRepository } from "persistence/sqlite/sqlite_round_repository.ts";
import { HeartRate } from "../../src/domain/exams/parameters/heart_rate.ts";
import { Round } from "../../src/domain/exams/rounds/round.ts";
import { assertEquals } from "dev_deps";
import { init_test_db, populate } from "./test_db.ts";
import { RespiratoryRate } from "../../src/domain/exams/parameters/respiratore_rate.ts";
import { Trc } from "../../src/domain/exams/parameters/trc.ts";
import { Avdn } from "../../src/domain/exams/parameters/avdn.ts";
import { Mucosas } from "../../src/domain/exams/parameters/mucosas.ts";
import { Temperature } from "../../src/domain/exams/parameters/temperature.ts";
import { BloodGlucose } from "../../src/domain/exams/parameters/blood_glucose.ts";
import { Hct } from "../../src/domain/exams/parameters/hct.ts";
import { BloodPressure } from "../../src/domain/exams/parameters/blood_pressure.ts";
import { PATIENTS } from "../fake_data.ts";

Deno.test("SQLite - Round Repository", async (t) => {
	await t.step(
		"Deve salvar uma ronda com o parametro da frequência cardiaca",
		async () => {
			const db = await init_test_db();
			populate(db);
			const persistence = new SQLiteRoundRepository(db);
			const round = new Round(PATIENTS.hospitalized["1918BA"].systemId);
			const heartRate = new HeartRate(80);
			const respiratoryRate = new RespiratoryRate(20);
			const trc = new Trc("Maior que 2'");
			const avdn = new Avdn("Alertas");
			const mucosas = new Mucosas("Rosadas");
			const temperature = new Temperature(38);
			const bloodGlucose = new BloodGlucose(67);
			const hct = new Hct(40);
			const bloodPressure = new BloodPressure("120/80(60)");
			round.addParameter(heartRate);
			round.addParameter(respiratoryRate);
			round.addParameter(trc);
			round.addParameter(avdn);
			round.addParameter(mucosas);
			round.addParameter(temperature);
			round.addParameter(bloodGlucose);
			round.addParameter(hct);
			round.addParameter(bloodPressure);
			await persistence.save(round);

			const measurements = await persistence.measurements(
				PATIENTS.hospitalized["1918BA"].systemId,
			);

			assertEquals(measurements.length, 9);
		},
	);

	await t.step(
		"Deve recuperar as ultimas medições do paciente para cada parametro",
		async () => {
			const db = await init_test_db();
			populate(db);
			const persistence = new SQLiteRoundRepository(db);
			const round = new Round(PATIENTS.hospitalized["1918BA"].systemId);
			const round2 = new Round(PATIENTS.hospitalized["1918BA"].systemId);

			const heartRate = new HeartRate(80);
			const respiratoryRate = new RespiratoryRate(20);
			const trc = new Trc("Maior que 2'");
			const avdn = new Avdn("Alertas");
			const mucosas = new Mucosas("Rosadas");
			const temperature = new Temperature(38);
			const bloodGlucose = new BloodGlucose(67);
			const hct = new Hct(40);
			const bloodPressure = new BloodPressure("120/80(60)");
			const heartRate2 = new HeartRate(89);
			round.addParameter(heartRate);
			round.addParameter(respiratoryRate);
			round.addParameter(trc);
			round.addParameter(avdn);
			round.addParameter(mucosas);
			round.addParameter(temperature);
			round.addParameter(bloodGlucose);
			round.addParameter(hct);
			round.addParameter(bloodPressure);

			round2.addParameter(heartRate2);
			await persistence.save(round);
			await persistence.save(round2);

			const measurements = await persistence.latestMeasurements(
				PATIENTS.hospitalized["1918BA"].systemId,
			);

			assertEquals(measurements.length, 9);
		},
	);
});
