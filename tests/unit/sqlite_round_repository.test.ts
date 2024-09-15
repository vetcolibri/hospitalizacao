import { assertEquals } from "dev_deps";
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
import { SQLiteRoundRepository } from "persistence/sqlite/sqlite_round_repository.ts";
import { PATIENTS } from "../fake_data.ts";
import { init_test_db, populate } from "./test_db.ts";

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
			round.add(heartRate);
			round.add(respiratoryRate);
			round.add(trc);
			round.add(avdn);
			round.add(mucosas);
			round.add(temperature);
			round.add(bloodGlucose);
			round.add(hct);
			round.add(bloodPressure);
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
			round.add(heartRate);
			round.add(respiratoryRate);
			round.add(trc);
			round.add(avdn);
			round.add(mucosas);
			round.add(temperature);
			round.add(bloodGlucose);
			round.add(hct);
			round.add(bloodPressure);

			round2.add(heartRate2);
			await persistence.save(round);
			await persistence.save(round2);

			const measurements = await persistence.latestMeasurements(
				PATIENTS.hospitalized["1918BA"].systemId,
			);

			assertEquals(measurements.length, 9);
		},
	);
});
