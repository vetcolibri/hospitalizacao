import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { PatientService } from "application/patient_service.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";
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

const OWNER_DATA = {
	name: "Yoan Fowas",
	phoneNumber: "998210817",
	whatsapp: true,
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

function hospitalizeBody(ownerData?: unknown) {
	return {
		patientId: "sys-1",
		hospitalizationData: HOSPITALIZATION_DATA,
		budgetData: BUDGET_DATA,
		ownerData,
	};
}

Deno.test("RF-11/RF-12 - hospitalizar com edição do tutor", async (t) => {
	await t.step(
		"grava a hospitalização e a edição do tutor na mesma transacção",
		async () => {
			const { transaction, calls } = makeTransaction();
			const order: string[] = [];
			const ownerCalls: unknown[] = [];
			const service = {
				newHospitalization: () => {
					order.push("newHospitalization");
					return Promise.resolve(right(undefined));
				},
				updateOwner: (...args: unknown[]) => {
					order.push("updateOwner");
					ownerCalls.push(args);
					return Promise.resolve(right(undefined));
				},
			};
			const app = makeApp(service, transaction);

					const response = await post(app, "/patients/hospitalize", hospitalizeBody(OWNER_DATA));

			assertEquals(response?.status, 201);
			assertEquals(calls, { begin: 1, commit: 1, rollback: 0 });
			assertEquals(ownerCalls, [["sys-1", OWNER_DATA, "reception1"]]);
			assertEquals(order, ["updateOwner", "newHospitalization"]);
		},
	);

	await t.step("sem edição do tutor não chama a actualização", async () => {
		const { transaction, calls } = makeTransaction();
		let updateCalls = 0;
		const service = {
			newHospitalization: () => Promise.resolve(right(undefined)),
			updateOwner: () => {
				updateCalls++;
				return Promise.resolve(right(undefined));
			},
		};
		const app = makeApp(service, transaction);

		const response = await post(app, "/patients/hospitalize", hospitalizeBody());

		assertEquals(response?.status, 201);
		assertEquals(updateCalls, 0);
		assertEquals(calls, { begin: 1, commit: 1, rollback: 0 });
	});

	await t.step("erro de negócio ao editar o tutor desfaz a hospitalização", async () => {
		const { transaction, calls } = makeTransaction();
		let hospitalizationCalls = 0;
		const service = {
			newHospitalization: () => {
				hospitalizationCalls++;
				return Promise.resolve(right(undefined));
			},
			updateOwner: () => Promise.resolve(left(new PermissionDenied("sem permissão"))),
		};
		const app = makeApp(service, transaction);

		const response = await post(app, "/patients/hospitalize", hospitalizeBody(OWNER_DATA));

		assertEquals(response?.status, 403);
		assertEquals(hospitalizationCalls, 0, "Não deve abrir a hospitalização.");
		assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
	});

	await t.step("tutor em falta ao editar devolve 404 e desfaz a hospitalização", async () => {
		const { transaction, calls } = makeTransaction();
		let hospitalizationCalls = 0;
		const service = {
			newHospitalization: () => {
				hospitalizationCalls++;
				return Promise.resolve(right(undefined));
			},
			updateOwner: () => Promise.resolve(left(new OwnerNotFound())),
		};
		const app = makeApp(service, transaction);

		const response = await post(app, "/patients/hospitalize", hospitalizeBody(OWNER_DATA));

		assertEquals(response?.status, 404);
		assertEquals(hospitalizationCalls, 0, "Não deve abrir a hospitalização.");
		assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
	});

	await t.step("falha de armazenamento ao editar o tutor desfaz a hospitalização", async () => {
		const { transaction, calls } = makeTransaction();
		const service = {
			newHospitalization: () => Promise.resolve(right(undefined)),
			updateOwner: () => Promise.reject(new Error("falha ao guardar tutor")),
		};
		const app = makeApp(service, transaction);

		const response = await post(app, "/patients/hospitalize", hospitalizeBody(OWNER_DATA));

		assertEquals(response?.status, 500);
		assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
	});

	await t.step("utilizador sem permissão não altera nada", async () => {
		const { transaction, calls } = makeTransaction();
		let hospitalizationCalls = 0;
		const service = {
			newHospitalization: () => {
				hospitalizationCalls++;
				return Promise.resolve(right(undefined));
			},
			updateOwner: () => Promise.resolve(left(new PermissionDenied("sem permissão"))),
		};
		const app = makeApp(service, transaction);

		const response = await post(app, "/patients/hospitalize", hospitalizeBody(OWNER_DATA));

		assertEquals(response?.status, 403);
		assertEquals(hospitalizationCalls, 0, "Não deve hospitalizar.");
		assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
	});

	await t.step("falha da hospitalização desfaz a edição do tutor", async () => {
		const { transaction, calls } = makeTransaction();
		const service = {
			newHospitalization: () => Promise.resolve(left(new PatientNotFound())),
			updateOwner: () => Promise.resolve(right(undefined)),
		};
		const app = makeApp(service, transaction);

		const response = await post(app, "/patients/hospitalize", hospitalizeBody(OWNER_DATA));

		assertEquals(response?.status, 404);
		assertEquals(calls, { begin: 1, commit: 0, rollback: 1 });
	});
});

Deno.test("RF-11/RF-12 - validação da edição do tutor", async (t) => {
	const invalidCases: { name: string; ownerData: unknown; path: string }[] = [
		{
			name: "nome vazio",
			ownerData: { ...OWNER_DATA, name: "" },
			path: "ownerData.name",
		},
		{
			name: "telefone angolano inválido",
			ownerData: { ...OWNER_DATA, phoneNumber: "12345" },
			path: "ownerData.phoneNumber",
		},
		{
			name: "telefone não numérico",
			ownerData: { ...OWNER_DATA, phoneNumber: "telefone" },
			path: "ownerData.phoneNumber",
		},
		{
			name: "WhatsApp em falta",
			ownerData: { name: OWNER_DATA.name, phoneNumber: OWNER_DATA.phoneNumber },
			path: "ownerData.whatsapp",
		},
		{
			name: "WhatsApp não booleano",
			ownerData: { ...OWNER_DATA, whatsapp: "sim" },
			path: "ownerData.whatsapp",
		},
	];

	for (const testCase of invalidCases) {
		await t.step(`${testCase.name} é recusado por campo`, async () => {
			const { transaction, calls } = makeTransaction();
			let serviceCalls = 0;
			const service = {
				newHospitalization: () => {
					serviceCalls++;
					return Promise.resolve(right(undefined));
				},
				updateOwner: () => {
					serviceCalls++;
					return Promise.resolve(right(undefined));
				},
			};
			const app = makeApp(service, transaction);

			const response = await post(
				app,
				"/patients/hospitalize",
				hospitalizeBody(testCase.ownerData),
			);
			const body = await response?.json();

			assertEquals(response?.status, 400);
			assertEquals(body.errors[0].path, testCase.path);
			assertEquals(serviceCalls, 0, "Não deve executar nenhuma operação.");
			assertEquals(calls, { begin: 0, commit: 0, rollback: 0 });
		});
	}
});
