import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { PatientService } from "application/patient_service.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientAlreadyHospitalized } from "domain/patient/patient_already_hospitalized_error.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { left, right } from "shared/either.ts";
import { TransactionController } from "shared/transaction_controller.ts";

const HOSPITALIZATION_DATA = {
	weight: 16.5,
	entryDate: "2021-01-01",
	complaints: ["Queixa 1"],
	diagnostics: ["Diagnostico 1"],
};

const BUDGET_DATA = {
	startOn: "2021-01-01",
	endOn: "2021-01-10",
	status: "NÃO PAGO",
};

const HOSPITALIZE_BODY = {
	patientId: "sys-1",
	hospitalizationData: HOSPITALIZATION_DATA,
	budgetData: BUDGET_DATA,
};

function makeApp(service: unknown, transaction: TransactionController) {
	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = "reception1";
		await next();
	});
	app.use(patientsRouter(service as PatientService, transaction).routes());
	return app;
}

function makeTransaction() {
	const calls = { begin: 0, commit: 0, rollback: 0 };
	const transaction: TransactionController = {
		begin: () => {
			calls.begin++;
			return Promise.resolve();
		},
		commit: () => {
			calls.commit++;
			return Promise.resolve();
		},
		rollback: () => {
			calls.rollback++;
			return Promise.resolve();
		},
	};
	return { transaction, calls };
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

Deno.test("hospitalizing an existing patient is committed and forwards the budget", async () => {
	const { transaction, calls } = makeTransaction();
	let received: unknown[] = [];
	const service = {
		newHospitalization: (...args: unknown[]) => {
			received = args;
			return Promise.resolve(right(undefined));
		},
	};
	const app = makeApp(service, transaction);

	const response = await post(app, "/patients/hospitalize", HOSPITALIZE_BODY);

	assertEquals(response?.status, 201);
	assertEquals(calls, { begin: 1, commit: 1, rollback: 0 });
	assertEquals(received, ["sys-1", HOSPITALIZATION_DATA, BUDGET_DATA, "reception1"]);
});

Deno.test("hospitalization business errors roll back the transaction", async () => {
	const { transaction, calls } = makeTransaction();
	const service = {
		newHospitalization: () =>
			Promise.resolve(left(new PatientAlreadyHospitalized("Rex"))),
	};
	const app = makeApp(service, transaction);

	const response = await post(app, "/patients/hospitalize", HOSPITALIZE_BODY);

	assertEquals(response?.status, 400);
	assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
});

Deno.test("a storage failure rolls back the hospitalization transaction", async () => {
	const { transaction, calls } = makeTransaction();
	const service = {
		newHospitalization: () => Promise.reject(new Error("falha ao guardar orçamento")),
	};
	const app = makeApp(service, transaction);

	const response = await post(app, "/patients/hospitalize", HOSPITALIZE_BODY);

	assertEquals(response?.status, 500);
	assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
});

Deno.test("an unauthorized user cannot hospitalize", async () => {
	const { transaction, calls } = makeTransaction();
	const service = {
		newHospitalization: () => Promise.resolve(left(new PermissionDenied("sem permissão"))),
	};
	const app = makeApp(service, transaction);

	const response = await post(app, "/patients/hospitalize", HOSPITALIZE_BODY);

	assertEquals(response?.status, 403);
	assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
});

const PATIENT = Patient.restore({
	systemId: "sys-1",
	patientId: "CVL-001",
	name: "Rex",
	specie: "CANINO",
	breed: "bulldog",
	birthDate: "2013-07-01",
	ownerId: "owner-1",
	status: PatientStatus.Discharged,
});

Deno.test("searching an existing patient returns the clinic ID and internal id", async () => {
	const { transaction } = makeTransaction();
	let received: unknown[] = [];
	const service = {
		searchPatient: (...args: unknown[]) => {
			received = args;
			return Promise.resolve(right(PATIENT));
		},
	};
	const app = makeApp(service, transaction);

	const response = await app.handle(
		new Request("http://localhost/patients/search/CVL-001"),
	);
	const body = await response?.json();

	assertEquals(response?.status, 200);
	assertEquals(received, ["CVL-001", "reception1"]);
	assertEquals(body.systemId, "sys-1");
	assertEquals(body.patientId, "CVL-001");
	assertEquals(body.ownerId, "owner-1");
	// O formulário preenche um input de data: a data sai sem horas.
	assertEquals(body.birthDate, "2013-07-01");
});

Deno.test("searching a missing patient returns 404", async () => {
	const { transaction } = makeTransaction();
	const service = { searchPatient: () => Promise.resolve(left(new PatientNotFound())) };
	const app = makeApp(service, transaction);

	const response = await app.handle(
		new Request("http://localhost/patients/search/NAO-EXISTE"),
	);

	assertEquals(response?.status, 404);
});

Deno.test("searching without permission is refused", async () => {
	const { transaction } = makeTransaction();
	const service = {
		searchPatient: () => Promise.resolve(left(new PermissionDenied("sem permissão"))),
	};
	const app = makeApp(service, transaction);

	const response = await app.handle(
		new Request("http://localhost/patients/search/CVL-001"),
	);

	assertEquals(response?.status, 403);
});

Deno.test("hospitalization requires the budget data", async () => {
	const { transaction, calls } = makeTransaction();
	const service = { newHospitalization: () => Promise.resolve(right(undefined)) };
	const app = makeApp(service, transaction);

	const response = await post(app, "/patients/hospitalize", {
		patientId: "sys-1",
		hospitalizationData: HOSPITALIZATION_DATA,
	});

	assertEquals(response?.status, 400);
	assertEquals(calls, { begin: 0, commit: 0, rollback: 0 });
});

Deno.test("search route is not shadowed by the patient lookup route", async () => {
	const { transaction } = makeTransaction();
	const service = {
		searchPatient: () => Promise.resolve(right(PATIENT)),
		getPatientById: () => Promise.resolve(left(new PatientNotFound())),
	};
	const app = makeApp(service, transaction);

	const response = await app.handle(
		new Request("http://localhost/patients/search/CVL-001"),
	);

	assertEquals(response?.status, 200);
});
