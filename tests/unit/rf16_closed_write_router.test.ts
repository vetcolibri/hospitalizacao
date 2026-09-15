import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { PatientService } from "application/patient_service.ts";
import { Budget } from "domain/budget/budget.ts";
import { Hospitalization, HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { Patient } from "domain/patient/patient.ts";
import { Role, User } from "domain/auth/user.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { InmemAlertRepository } from "persistence/inmem/inmem_alert_repository.ts";
import { InmemBudgetRepository } from "persistence/inmem/inmem_budget_repository.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { InmemPatientRepository } from "persistence/inmem/inmem_patient_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { ID } from "shared/id.ts";
import { AlertNotifierDummy } from "../dummies/alert_notifier_dummy.ts";
import { TransationControllerStub } from "../stubs/transation_controller_stub.ts";

/**
 * RF-16 — contrato HTTP das escritas de encerramento. Uma escrita fechada ou
 * ambígua é recusada com 400 (não 200), para que a UI não trate o episódio
 * encerrado como editável.
 */

const RECEPTION = "reception1";
const PATIENT_ID = "9010RF";

function patient(): Patient {
	return new Patient(
		ID.fromString(PATIENT_ID),
		"RF16-HTTP",
		"Rex HTTP",
		"CANINO",
		"bulldog",
		"2013-07-01",
		"owner-rf16-http",
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

function makeApp(hospitalizations: Hospitalization[]) {
	const service = new PatientService(
		new InmemPatientRepository([patient()]),
		new InmemOwnerRepository(),
		new InmemHospitalizationRepository(hospitalizations),
		new InmemBudgetRepository([
			new Budget(ID.fromString("b1"), ID.fromString("h1"), "2026-01-01", "2026-01-10", "NÃO PAGO"),
		]),
		new InmemAlertRepository(),
		new InmemUserRepository([new User(RECEPTION, RECEPTION, Role.Reception)]),
		new AlertNotifierDummy(),
	);

	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = RECEPTION;
		await next();
	});
	app.use(patientsRouter(service, new TransationControllerStub()).routes());
	return app;
}

function post(app: Application, path: string, body: unknown) {
	return app.handle(
		new Request(`http://localhost${path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

Deno.test("RF-16 - escrita de encerramento em episódio fechado/ambíguo é 400", async (t) => {
	await t.step("end-hospitalization com duas abertas é 400", async () => {
		const app = makeApp([hospitalization("h1", true), hospitalization("h2", true)]);

		const response = await post(app, "/patients/end-hospitalization", { patientId: PATIENT_ID });

		assertEquals(response?.status, 400);
	});

	await t.step("end-hospitalization sem episódio aberto é 400", async () => {
		const app = makeApp([hospitalization("h1", false)]);

		const response = await post(app, "/patients/end-hospitalization", { patientId: PATIENT_ID });

		assertEquals(response?.status, 400);
	});

	await t.step("end-budget no episódio encerrado é 400", async () => {
		const app = makeApp([hospitalization("h1", false)]);

		const response = await post(app, "/patients/end-budget", {
			patientId: PATIENT_ID,
			hospitalizationId: "h1",
			status: "PAGO",
		});

		assertEquals(response?.status, 400);
	});

	await t.step("end-budget no episódio aberto correspondente é 200", async () => {
		const app = makeApp([hospitalization("h1", true)]);

		const response = await post(app, "/patients/end-budget", {
			patientId: PATIENT_ID,
			hospitalizationId: "h1",
			status: "PAGO",
		});

		assertEquals(response?.status, 200);
	});
});
