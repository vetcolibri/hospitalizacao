import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { AlertService } from "application/alert_service.ts";
import {
  assertEquals,
  assertInstanceOf,
  assertSpyCall,
  assertSpyCalls,
  spy,
} from "dev_deps";
import { Alert, AlertStatus } from "domain/alerts/alert.ts";
import { ID } from "shared/id.ts";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";

import { patient1 } from "../fake_data.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

Deno.test("Alert Service - Schedule Alert", async (t) => {
  await t.step("Deve buscar o paciente no repositório", async () => {
    const { service, patientRepository } = await makeService();
    const repoSpy = spy(patientRepository, "getById");

    await service.schedule("1234", alertData);

    assertSpyCall(repoSpy, 0, { args: [ID.New("1234")] });
    assertSpyCalls(repoSpy, 1);
  });

  await t.step(
    "Deve retornar @PatientNotFound se o paciente não existir",
    async () => {
      const { service } = await makeService();

      const error = await service.schedule("1234", alertData);

      assertEquals(error.isLeft(), true);
      assertInstanceOf(error.value, PatientNotFound);
    }
  );

  await t.step("Deve salvar o alerta no repositório", async () => {
    const { service, alertRepository } = await makeService();
    const repoSpy = spy(alertRepository, "save");

    await service.schedule("some-patient-id", alertData);

    const alert = await alertRepository.last();

    assertSpyCall(repoSpy, 0, { args: [alert] });
    assertSpyCalls(repoSpy, 1);
    assertEquals(alert.getStatus(), AlertStatus.ENABLED);
  });

  await t.step("Deve registar os parâmetros do alerta", async () => {
    const { service, alertRepository } = await makeService();

    await service.schedule("some-patient-id", alertData);

    const alerts = await alertRepository.findAll(ID.New("some-patient-id"));

    assertEquals(alerts.length, 2);
    assertEquals(alerts[1].getParameters(), alertData.parameters);
  });

  await t.step("Deve agendar o alerta.", async () => {
    const { service, alertRepository, patientRepository, notifier } =
      await makeService();
    await patientRepository.save(patient1);
    const notifierSpy = spy(notifier, "schedule");

    await service.schedule("some-patient-id", alertData);

    const alert = await alertRepository.last();

    assertSpyCall(notifierSpy, 0, { args: [alert] });
    assertSpyCalls(notifierSpy, 1);
  });

  await t.step(
    "Deve receber a frequência de apresentação do alerta.",
    async () => {
      const { service, alertRepository } = await makeService();

      await service.schedule("some-patient-id", alertData);

      const alert = await alertRepository.last();
      assertEquals(alert.getRate(), alertData.rate);
    }
  );

  await t.step(
    "Deve receber o comentário do medVet para o alerta",
    async () => {
      const { service, alertRepository } = await makeService();

      await service.schedule("some-patient-id", alertData);

      const alert = await alertRepository.last();
      assertEquals(alert.comments, alertData.comments);
    }
  );

  await t.step("Deve receber a hora de exibição do alerta", async () => {
    const { service, alertRepository, patientRepository } = await makeService();
    await patientRepository.save(patient1);

    await service.schedule("some-patient-id", alertData);

    const alert = await alertRepository.last();
    assertEquals(alert.getTime(), alertData.time);
  });

  await t.step(
    "Deve retornar @InvalidRate se o frequencia for menor que 1 segundo.",
    async () => {
      const { service } = await makeService();

      const error = await service.schedule("some-patient-id", {
        ...alertData,
        rate: 0,
      });

      assertEquals(error.isLeft(), true);
    }
  );
});

Deno.test("Alert Service - Cancel Alert", async (t) => {
  await t.step(
    "Deve recuperar o alerta activo no repositório com base no ID.",
    async () => {
      const { service, alertRepository } = await makeService();
      const alert = await alertRepository.last();
      const repoSpy = spy(alertRepository, "getById");

      await service.cancel(alert.alertId.value);

      assertSpyCall(repoSpy, 0, { args: [alert.alertId] });
      assertSpyCalls(repoSpy, 1);
    }
  );

  await t.step(
    "Deve alterar o estado do alerta para **disabled**.",
    async () => {
      const { service, alertRepository } = await makeService();
      const alert = await alertRepository.last();

      await service.cancel(alert.alertId.value);

      assertEquals(alert.getStatus(), AlertStatus.DISABLED);
    }
  );

  await t.step("Deve actualizar o alerta no repositório.", async () => {
    const { service, alertRepository } = await makeService();
    const alert = await alertRepository.last();
    const repoSpy = spy(alertRepository, "update");

    await service.cancel(alert.alertId.value);

    assertSpyCall(repoSpy, 0);
    assertSpyCalls(repoSpy, 1);
  });

  await t.step(
    "Deve chamar o método removeCron para remover o alerta.",
    async () => {
      const { service, alertRepository, notifier } = await makeService();
      const alert = await alertRepository.last();
      const notifierSpy = spy(notifier, "cancel");

      await service.cancel(alert.alertId.value);

      assertSpyCall(notifierSpy, 0);
      assertSpyCalls(notifierSpy, 1);
    }
  );

  await t.step(
    "Deve retornar @AlertNotFound se o alerta não existir.",
    async () => {
      const { service } = await makeService();

      const error = await service.cancel("dummy");

      assertEquals(error.isLeft(), true);
    }
  );

  await t.step(
    "Deve retornar @AlertAlreadyDisabled se o alerta já estiver desactivado.",
    async () => {
      const { service, alertRepository } = await makeService();
      const alert = await alertRepository.last();
      alert.cancel();

      const error = await service.cancel(alert.alertId.value);

      assertEquals(error.isLeft(), true);
    }
  );
});

const alertData = {
  parameters: ["heartRate", "bloodPressure", "glicemia"],
  rate: 120,
  time: new Date().toISOString(),
  comments: "Some comment.",
};

async function makeService() {
  const alert = Alert.create(patient1, alertData);
  const alertRepository = new InmemAlertRepository();
  await alertRepository.save(alert.value as Alert);
  const patientRepository = new InmemPatientRepository();
  await patientRepository.save(patient1);
  const notifier = new AlertNotifierDummy();

  const service = new AlertService(
    alertRepository,
    patientRepository,
    notifier
  );
  return { alertRepository, patientRepository, notifier, service };
}
