import { assertEquals } from "dev_deps";
import { Avdn } from "domain/parameters/avdn.ts";
import { BloodPressure } from "domain/parameters/blood_pressure.ts";
import { BloodGlucose } from "domain/parameters/blood_glucose.ts";
import { Hct } from "domain/parameters/hct.ts";
import { HeartRate } from "domain/parameters/heart_rate.ts";
import { Mucosas } from "domain/parameters/mucosas.ts";
import { RespiratoryRate } from "domain/parameters/respiratore_rate.ts";
import { Temperature } from "domain/parameters/temperature.ts";
import { Trc } from "domain/parameters/trc.ts";

Deno.test("Parameters", async (t) => {
  await t.step("Deve criar o parâmtero Frequência cardiaca válido.", () => {
    const heartRate = new HeartRate(78);

    const valid = heartRate.isValid();

    assertEquals(valid, true);
    assertEquals(heartRate.value, 78);
    assertEquals(heartRate.issuedAt.toLocaleDateString(), date);
  });

  await t.step(
    "Deve ser inválido a Frequência cardiaca acima de 300Bpm.",
    () => {
      const heartRate = new HeartRate(478);

      const valid = heartRate.isValid();

      assertEquals(valid, false);
    }
  );

  await t.step("Deve criar o parâmtero Frequência respiratória válido.", () => {
    const respiratoryRate = new RespiratoryRate(23);

    const valid = respiratoryRate.isValid();

    assertEquals(valid, true);
    assertEquals(respiratoryRate.value, 23);
    assertEquals(respiratoryRate.issuedAt.toLocaleDateString(), date);
  });

  await t.step(
    "Deve ser inválido a Frequência respiratória acima de 100Rpm.",
    () => {
      const respiratoryRate = new RespiratoryRate(378);
      const valid = respiratoryRate.isValid();
      assertEquals(valid, false);
    }
  );

  await t.step("Deve criar o parâmtero da Trc válido.", () => {
    const trc = new Trc(2);

    const valid = trc.isValid();

    assertEquals(valid, true);
    assertEquals(trc.value, 2);
    assertEquals(trc.issuedAt.toLocaleDateString(), date);
  });

  await t.step("Deve ser inválido o Trc acima de 2'.", () => {
    const trc = new Trc(59);

    const valid = trc.isValid();

    assertEquals(valid, false);
  });

  await t.step("Deve criar o parâmtero Avdn válido.", () => {
    const avdn = new Avdn("Alerta");

    const valid = avdn.isValid();

    assertEquals(valid, true);
    assertEquals(avdn.value, "Alerta");
    assertEquals(avdn.issuedAt.toLocaleDateString(), date);
  });

  await t.step("Deve ser inválido o Avdn fora dos valores desejados.", () => {
    const avdn = new Avdn("Rosadas");

    const valid = avdn.isValid();

    assertEquals(valid, false);
  });

  await t.step("Deve criar o parâmtero Mucosas válido.", () => {
    const mucosas = new Mucosas("Rosadas");

    const valid = mucosas.isValid();

    assertEquals(valid, true);
    assertEquals(mucosas.value, "Rosadas");
    assertEquals(mucosas.issuedAt.toLocaleDateString(), date);
  });

  await t.step(
    "Deve ser inválido o Mucosas fora dos valores desejados.",
    () => {
      const mucosas = new Mucosas("Alerta");
      const valid = mucosas.isValid();
      assertEquals(valid, false);
    }
  );

  await t.step("Deve criar o parâmtero Temperatura válido.", () => {
    const tempeture = new Temperature(38);

    const valid = tempeture.isValid();

    assertEquals(valid, true);
    assertEquals(tempeture.value, 38);
    assertEquals(tempeture.issuedAt.toLocaleDateString(), date);
  });

  await t.step("Deve ser inválido o Temperatura acima de 100Cº.", () => {
    const tempeture = new Temperature(450);

    const valid = tempeture.isValid();

    assertEquals(valid, false);
  });

  await t.step("Deve criar o parâmtero Glicemia válido.", () => {
    const glicemia = new BloodGlucose(68);

    const valid = glicemia.isValid();

    assertEquals(valid, true);
    assertEquals(glicemia.value, 68);
    assertEquals(glicemia.issuedAt.toLocaleDateString(), date);
  });

  await t.step("Deve ser inválido o Glicemia acima de 300mg/dl.", () => {
    const glicemia = new BloodGlucose(450);

    const valid = glicemia.isValid();

    assertEquals(valid, false);
  });

  await t.step("Deve criar o parâmtero Hct válido.", () => {
    const hct = new Hct(40);

    const valid = hct.isValid();

    assertEquals(valid, true);
    assertEquals(hct.value, 40);
    assertEquals(hct.issuedAt.toLocaleDateString(), date);
  });

  await t.step("Deve ser inválido o Hct acima de 100%.", () => {
    const hct = new Hct(123);

    const valid = hct.isValid();

    assertEquals(valid, false);
  });

  await t.step("Deve criar o parâmtero Pressão arterial válido.", () => {
    const bloodPressure = new BloodPressure("123/80(60)");

    const valid = bloodPressure.isValid();

    assertEquals(valid, true);
    assertEquals(bloodPressure.value, "123/80(60)");
    assertEquals(bloodPressure.issuedAt.toLocaleDateString(), date);
  });

  await t.step(
    "Deve ser inválido o Pressão arterial acima de 280/180(100).",
    () => {
      const bloodPressure = new BloodPressure("300/200(300)");

      const valid = bloodPressure.isValid();

      assertEquals(valid, false);
    }
  );
});

const date = new Date().toLocaleDateString();
