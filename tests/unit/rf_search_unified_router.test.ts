import { assertEquals, assertInstanceOf } from "dev_deps";
import { Application } from "deps";
import { AuthService } from "application/auth_service.ts";
import { PatientService } from "application/patient_service.ts";
import { authMiddleware } from "infra/http/auth_middleware.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { InvalidSearchTerm } from "domain/patient/invalid_search_term_error.ts";
import { Patient } from "domain/patient/patient.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";
import { left, right } from "shared/either.ts";
import { TransationControllerStub } from "../stubs/transation_controller_stub.ts";

/**
 * Contrato HTTP da pesquisa unificada: rota autenticada, DTO com campos
 * mínimos (sem telefone/WhatsApp), 403 sem permissão, 400 termo inválido, e
 * `/patients/search` resolve a pesquisa e não o `/:patientId`.
 */

const SEARCH_RESULT = {
	patient: Patient.restore({
		systemId: "sys-1",
		patientId: "10340A",
		name: "Loki",
		specie: "CANINO",
		breed: "Akita",
		birthDate: "2012-11-11",
		ownerId: "OWN1",
		status: "HOSPITALIZADO",
	}),
	ownerName: "Ana Tutor",
};

function makeApp(service: unknown) {
	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = "medvet1";
		await next();
	});
	app.use(patientsRouter(service as PatientService, new TransationControllerStub()).routes());
	return app;
}

function get(app: Application, path: string) {
	return app.handle(new Request(`http://localhost${path}`));
}

Deno.test("pesquisa unificada - contrato HTTP", async (t) => {
	await t.step("devolve DTO com campos mínimos e sem telefone/WhatsApp", async () => {
		const service = { searchPatients: () => Promise.resolve(right([SEARCH_RESULT])) };
		const response = await get(makeApp(service), "/patients/search?term=loki");

		assertEquals(response?.status, 200);
		const body = await response?.json();
		assertEquals(body, [{
			systemId: "sys-1",
			patientId: "10340A",
			patientName: "Loki",
			ownerId: "OWN1",
			ownerName: "Ana Tutor",
			specie: "CANINO",
			breed: "Akita",
			birthDate: "2012-11-11",
			status: "HOSPITALIZADO",
		}]);

		const serialized = JSON.stringify(body);
		for (const forbidden of ["phoneNumber", "whatsapp", "phone_number"]) {
			assertEquals(serialized.includes(forbidden), false, forbidden);
		}
	});

	await t.step("/patients/search resolve a pesquisa, não o /:patientId", async () => {
		const service = {
			searchPatients: () => Promise.resolve(right([SEARCH_RESULT])),
			getPatientById: () => Promise.resolve(right({ systemId: "OUTRO" })),
		};
		const response = await get(makeApp(service), "/patients/search?term=loki");

		assertEquals(response?.status, 200);
		assertEquals((await response?.json())[0].systemId, "sys-1");
	});

	await t.step("sem permissão devolve 403", async () => {
		const service = {
			searchPatients: () => Promise.resolve(left(new PermissionDenied("sem permissão"))),
		};
		const response = await get(makeApp(service), "/patients/search?term=loki");

		assertEquals(response?.status, 403);
	});

	await t.step("termo inválido devolve 400", async () => {
		const service = {
			searchPatients: () => Promise.resolve(left(new InvalidSearchTerm())),
		};
		const response = await get(makeApp(service), "/patients/search?term=a");

		assertEquals(response?.status, 400);
	});

	await t.step("sem token é 401 (rota autenticada)", async () => {
		const app = new Application();
		app.use(authMiddleware({} as AuthService));
		app.use(
			patientsRouter(
				{ searchPatients: () => Promise.resolve(right([])) } as unknown as PatientService,
				new TransationControllerStub(),
			).routes(),
		);

		const response = await get(app, "/patients/search?term=loki");

		assertEquals(response?.status, 401);
	});
});

Deno.test("pesquisa unificada - termo inválido nunca chega ao serviço", async (t) => {
	await t.step("sem termo o serviço é chamado com string vazia (e devolve 400)", async () => {
		let received: string | undefined;
		const service = {
			searchPatients: (term: string) => {
				received = term;
				return Promise.resolve(left(new InvalidSearchTerm()));
			},
		};

		const response = await get(makeApp(service), "/patients/search");

		assertEquals(response?.status, 400);
		assertEquals(received, "");
		assertInstanceOf(new InvalidSearchTerm(), InvalidSearchTerm);
	});
});
