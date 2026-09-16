import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { PatientService } from "application/patient_service.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { TransationControllerStub } from "../stubs/transation_controller_stub.ts";

/**
 * Regressão dos routers HTTP: um erro que NÃO é `Error` (string/object lançado)
 * tem de continuar a produzir a resposta genérica de 500, sem alterar o
 * contrato. O `catch` normaliza `unknown` antes de chamar `sendServerError`.
 */

function makeApp(service: unknown): Application {
	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = "reception1";
		await next();
	});
	app.use(patientsRouter(service as PatientService, new TransationControllerStub()).routes());
	return app;
}

function postEndBudget(app: Application) {
	return app.handle(
		new Request("http://localhost/patients/end-budget", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ patientId: "sys-1", hospitalizationId: "h1", status: "PAGO" }),
		}),
	);
}

Deno.test("routers - erro não-Error é normalizado sem mudar a resposta", async (t) => {
	await t.step("string lançada devolve 500 com a mensagem genérica", async () => {
		const service = {
			endBudget: () => {
				throw "falha lançada como string";
			},
		};

		const response = await postEndBudget(makeApp(service));

		assertEquals(response?.status, 500);
		assertEquals(
			(await response?.json()).message,
			"Erro desconhecido, contacte o Administrador",
		);
	});

	await t.step("objecto lançado devolve 500 com a mensagem genérica", async () => {
		const service = {
			endBudget: () => {
				throw { reason: "falha lançada como objecto" };
			},
		};

		const response = await postEndBudget(makeApp(service));

		assertEquals(response?.status, 500);
		assertEquals(
			(await response?.json()).message,
			"Erro desconhecido, contacte o Administrador",
		);
	});
});
