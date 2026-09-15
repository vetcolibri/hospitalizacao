import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { PatientService } from "application/patient_service.ts";
import patientsRouter from "infra/http/patients_router.ts";
import { right } from "shared/either.ts";
import { TransactionController } from "shared/transaction_controller.ts";

/**
 * RF-13 — o contacto específico viaja dentro da hospitalização e é validado no
 * limite HTTP. Nada fora de name/phoneNumber/whatsapp é aceite do cliente.
 */

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

const CONTACT = { name: "Maria José", phoneNumber: "923456789", whatsapp: true };

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

function post(app: Application, body: unknown) {
	return app.handle(
		new Request("http://localhost/patients/hospitalize", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

function body(hospitalizationData?: unknown) {
	return {
		patientId: "sys-1",
		hospitalizationData,
		budgetData: BUDGET_DATA,
	};
}

Deno.test("RF-13 - contacto específico no hospitalizar", async (t) => {
	await t.step(
		"aceita o contacto dentro da hospitalização e passa-o ao serviço",
		async () => {
			const { transaction, calls } = makeTransaction();
			const received: unknown[] = [];
			const service = {
				newHospitalization: (...args: unknown[]) => {
					received.push(args);
					return Promise.resolve(right(undefined));
				},
				updateOwner: () => Promise.resolve(right(undefined)),
			};
			const app = makeApp(service, transaction);

			const response = await post(
				app,
				body({ ...HOSPITALIZATION_DATA, contact: CONTACT }),
			);

			assertEquals(response?.status, 201);
			assertEquals(calls, { begin: 1, commit: 1, rollback: 0 });
			assertEquals(received.length, 1);
			assertEquals(received[0][1], { ...HOSPITALIZATION_DATA, contact: CONTACT });
		},
	);

	await t.step("sem contacto a hospitalização continua válida", async () => {
		const { transaction, calls } = makeTransaction();
		const received: unknown[] = [];
		const service = {
			newHospitalization: (...args: unknown[]) => {
				received.push(args);
				return Promise.resolve(right(undefined));
			},
			updateOwner: () => Promise.resolve(right(undefined)),
		};
		const app = makeApp(service, transaction);

		const response = await post(app, body({ ...HOSPITALIZATION_DATA }));

		assertEquals(response?.status, 201);
		assertEquals(calls, { begin: 1, commit: 1, rollback: 0 });
		assertEquals(received[0][1], HOSPITALIZATION_DATA);
	});

	await t.step(
		"não deixa o cliente injectar identificadores dentro do contacto",
		async () => {
			const { transaction } = makeTransaction();
			const received: unknown[] = [];
			const service = {
				newHospitalization: (...args: unknown[]) => {
					received.push(args);
					return Promise.resolve(right(undefined));
				},
				updateOwner: () => Promise.resolve(right(undefined)),
			};
			const app = makeApp(service, transaction);

			const response = await post(
				app,
				body({
					...HOSPITALIZATION_DATA,
					contact: { ...CONTACT, ownerId: "OWNER-PIRATA", contactId: "hosp-9" },
				}),
			);

			assertEquals(response?.status, 201);
			assertEquals(received[0][1], { ...HOSPITALIZATION_DATA, contact: CONTACT });
		},
	);
});

Deno.test("RF-13 - validação do contacto específico", async (t) => {
	const invalidCases: { name: string; contact: unknown; path: string }[] = [
		{
			name: "nome vazio",
			contact: { ...CONTACT, name: "" },
			path: "hospitalizationData.contact.name",
		},
		{
			name: "telefone angolano inválido",
			contact: { ...CONTACT, phoneNumber: "12345" },
			path: "hospitalizationData.contact.phoneNumber",
		},
		{
			name: "WhatsApp em falta",
			contact: { name: CONTACT.name, phoneNumber: CONTACT.phoneNumber },
			path: "hospitalizationData.contact.whatsapp",
		},
		{
			name: "WhatsApp não booleano",
			contact: { ...CONTACT, whatsapp: "sim" },
			path: "hospitalizationData.contact.whatsapp",
		},
		{
			name: "contacto não é objecto",
			contact: "telefone",
			path: "hospitalizationData.contact",
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
				body({ ...HOSPITALIZATION_DATA, contact: testCase.contact }),
			);
			const responseBody = await response?.json();

			assertEquals(response?.status, 400);
			assertEquals(responseBody.errors[0].path, testCase.path);
			assertEquals(serviceCalls, 0, "Não deve executar nenhuma operação.");
			assertEquals(calls, { begin: 0, commit: 0, rollback: 0 });
		});
	}
});
