import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { CrmService } from "application/crm_service.ts";
import crmRouter from "infra/http/crm_router.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { left } from "shared/either.ts";
import { TransactionController } from "shared/transaction_controller.ts";

Deno.test("report business errors roll back the transaction", async () => {
	let rollbacks = 0;
	const transaction: TransactionController = {
		begin: () => Promise.resolve(),
		commit: () => Promise.resolve(),
		rollback: () => {
			rollbacks++;
			return Promise.resolve();
		},
	};
	const service = {
		registerReport: () => Promise.resolve(left(new PatientNotFound())),
	} as unknown as CrmService;
	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = "user";
		await next();
	});
	app.use(crmRouter(service, transaction).routes());

	const response = await app.handle(new Request("http://localhost/owners/register-report", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			patientId: "missing",
			stateOfConsciousness: ["Consciente"],
			food: { types: ["Ração"], level: "1", datetime: "2026-06-26T10:00:00" },
			discharges: [],
			comments: "Teste",
		}),
	}));

	assertEquals(response?.status, 404);
	assertEquals(rollbacks, 1);
});
