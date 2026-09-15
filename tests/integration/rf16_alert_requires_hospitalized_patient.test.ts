import { assertEquals, assertInstanceOf, assertSpyCalls, spy } from "dev_deps";
import { AlertService } from "application/alert_service.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { MultipleOpenHospitalizations } from "domain/hospitalization/multiple_open_hospitalizations_error.ts";
import { Patient } from "domain/patient/patient.ts";
import { Role, User } from "domain/auth/user.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";

/**
 * RF-16 — um alerta é uma escrita clínica: só pode ser agendado enquanto o
 * paciente tiver EXACTAMENTE uma hospitalização aberta. Com zero ou duas
 * abertas, nada é guardado nem agendado no notificador. O bloqueio por paciente
 * serializa o agendamento contra o encerramento concorrente.
 */

const MEDVET = "medvet1";
const PATIENT_ID = "9011RF";

function patient(): Patient {
	return new Patient(
		ID.fromString(PATIENT_ID),
		"RF16-ALERT",
		"Rex Alerta",
		"CANINO",
		"bulldog",
		"2013-07-01",
		"owner-rf16-alert",
	);
}

function hospitalization(id: string, open: boolean): Hospitalization {
	return Hospitalization.restore({
		hospitalizationId: id,
		patientId: PATIENT_ID,
		weight: 12,
		complaints: ["Queixa"],
		diagnostics: ["Diagnostico"],
		entryDate: "2026-01-01T08:00:00.000Z",
		dischargeDate: open ? undefined : "2026-01-05T08:00:00.000Z",
		status: open ? HospitalizationStatus.Open : HospitalizationStatus.Close,
	});
}

const alertData = {
	patientId: PATIENT_ID,
	parameters: ["heartRate"],
	rate: 120,
	time: "2026-01-10T10:00:00.000Z",
	comments: "Alerta RF16",
	username: MEDVET,
};

function makeService(hospitalizations: Hospitalization[]) {
	const alertRepository = new InmemAlertRepository();
	const patientRepository = new InmemPatientRepository([patient()]);
	const notifier = new AlertNotifierDummy();

	const service = new AlertService(
		alertRepository,
		patientRepository,
		new InmemUserRepository([new User(MEDVET, MEDVET, Role.MedVet)]),
		notifier,
		new InmemHospitalizationRepository(hospitalizations),
	);

	return { service, alertRepository, patientRepository, notifier };
}

Deno.test("RF-16 - alerta exige exactamente uma hospitalização aberta", async (t) => {
	await t.step("sem nenhuma aberta recusa e não guarda nem agenda", async () => {
		const { service, alertRepository, notifier } = makeService([hospitalization("h1", false)]);
		const notifierSpy = spy(notifier, "schedule");

		const result = await service.schedule(alertData);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, HospitalizationNotFound);
		assertEquals((await alertRepository.findByPatientId(ID.fromString(PATIENT_ID))).length, 0);
		assertSpyCalls(notifierSpy, 0);
	});

	await t.step("com duas abertas recusa e não guarda nem agenda", async () => {
		const { service, alertRepository, notifier } = makeService([
			hospitalization("h1", true),
			hospitalization("h2", true),
		]);
		const notifierSpy = spy(notifier, "schedule");

		const result = await service.schedule(alertData);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, MultipleOpenHospitalizations);
		assertEquals((await alertRepository.findByPatientId(ID.fromString(PATIENT_ID))).length, 0);
		assertSpyCalls(notifierSpy, 0);
	});

	await t.step("com uma só aberta aceita, bloqueia o paciente e agenda", async () => {
		const { service, alertRepository, patientRepository, notifier } = makeService([
			hospitalization("h1", true),
		]);
		const lockSpy = spy(patientRepository, "lockBySystemId");
		const notifierSpy = spy(notifier, "schedule");

		const result = await service.schedule(alertData);

		assertEquals(result.isRight(), true);
		assertSpyCalls(lockSpy, 1);
		assertSpyCalls(notifierSpy, 1);
		assertEquals((await alertRepository.findByPatientId(ID.fromString(PATIENT_ID))).length, 1);
	});
});
