import { assertEquals, assertInstanceOf, assertSpyCalls, spy } from "dev_deps";
import { AlertService } from "application/alert_service.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";
import { PatientRepositoryStub } from "../stubs/patient_repository_stub.ts";

/**
 * RF-16 — encerrar a hospitalização impede clínica nova sobre o episódio
 * encerrado. Como os alertas são do paciente (não de um episódio), o
 * agendamento só é aceite enquanto o paciente está hospitalizado; um paciente
 * já com alta não pode receber alertas novos em nome do episódio encerrado.
 */

const MEDVET = "medvet1";

const alertData = {
	patientId: "1925BA",
	parameters: ["heartRate"],
	rate: 120,
	time: "2026-01-10T10:00:00.000Z",
	comments: "Alerta após alta",
	username: MEDVET,
};

Deno.test("RF-16 - paciente com alta não recebe alertas novos", async () => {
	const alertRepository = new InmemAlertRepository();
	const notifier = new AlertNotifierDummy();

	const service = new AlertService(
		alertRepository,
		new PatientRepositoryStub(),
		new InmemUserRepository([new User(MEDVET, MEDVET, Role.MedVet)]),
		notifier,
	);
	const notifierSpy = spy(notifier, "schedule");

	const result = await service.schedule(alertData);

	assertEquals(result.isLeft(), true);
	assertInstanceOf(result.value, PatientNotHospitalized);

	const alerts = await alertRepository.findByPatientId(ID.fromString("1925BA"));
	assertEquals(alerts.length, 0);
	assertSpyCalls(notifierSpy, 0);
});
