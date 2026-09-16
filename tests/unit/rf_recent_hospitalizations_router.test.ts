import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { AuthService } from "application/auth_service.ts";
import { HospitalizationService } from "application/hospitalization_service.ts";
import { authMiddleware } from "infra/http/auth_middleware.ts";
import hospitalizationsRouter from "infra/http/hospitalizations_router.ts";
import { InvalidRecentFilter } from "domain/hospitalization/invalid_recent_filter_error.ts";
import { HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { left, right } from "shared/either.ts";

/**
 * Fase 2 — contrato HTTP da listagem: DTO mínimo (sem dados clínicos),
 * 400 para filtros inválidos e 401 sem token.
 */

const RECENT = [
	{
		hospitalizationId: "h-1",
		systemId: "sys-1",
		entryDate: new Date("2026-03-05T08:00:00.000Z"),
		dischargeDate: new Date("2026-03-10T08:00:00.000Z"),
		status: HospitalizationStatus.Close,
		patientId: "10340A",
		patientName: "Loki",
		ownerId: "OWN1",
		ownerName: "Ana Tutor",
	},
	{
		hospitalizationId: "h-2",
		systemId: "sys-2",
		entryDate: new Date("2026-03-01T08:00:00.000Z"),
		status: HospitalizationStatus.Open,
		patientId: "10340B",
		patientName: "Mel",
		ownerId: "OWN2",
		ownerName: "Rui Tutor",
	},
];

function makeApp(service: unknown) {
	const app = new Application();
	app.use(async (ctx, next) => {
		ctx.state.username = "medvet1";
		await next();
	});
	app.use(hospitalizationsRouter(service as HospitalizationService).routes());
	return app;
}

function get(app: Application, path: string) {
	return app.handle(new Request(`http://localhost${path}`));
}

Deno.test("últimos internamentos - contrato HTTP", async (t) => {
	await t.step("devolve DTO mínimo sem dados clínicos nem contacto", async () => {
		const response = await get(
			makeApp({ findRecent: () => Promise.resolve(right(RECENT)) }),
			"/hospitalizations/recent?term=loki&from=2026-01-01&to=2026-03-31",
		);

		assertEquals(response?.status, 200);
		const body = await response?.json();

		assertEquals(body, [
			{
				hospitalizationId: "h-1",
				systemId: "sys-1",
				entryDate: "2026-03-05T08:00:00.000Z",
				dischargeDate: "2026-03-10T08:00:00.000Z",
				status: "Fechada",
				patientId: "10340A",
				patientName: "Loki",
				ownerId: "OWN1",
				ownerName: "Ana Tutor",
			},
			{
				hospitalizationId: "h-2",
				systemId: "sys-2",
				entryDate: "2026-03-01T08:00:00.000Z",
				status: "Aberta",
				patientId: "10340B",
				patientName: "Mel",
				ownerId: "OWN2",
				ownerName: "Rui Tutor",
			},
		]);

		const serialized = JSON.stringify(body);
		for (
			const forbidden of ["phone", "whatsapp", "complaints", "diagnostics", "weight", "contact"]
		) {
			assertEquals(serialized.includes(forbidden), false, forbidden);
		}
	});

	await t.step("passa termo e datas ao serviço", async () => {
		let received: unknown;
		const service = {
			findRecent: (filters: unknown) => {
				received = filters;
				return Promise.resolve(right([]));
			},
		};

		await get(makeApp(service), "/hospitalizations/recent?term=loki&from=2026-01-01&to=2026-03-31");

		assertEquals(received, { term: "loki", from: "2026-01-01", to: "2026-03-31" });
	});

	await t.step("filtros inválidos devolvem 400", async () => {
		const service = {
			findRecent: () => Promise.resolve(left(new InvalidRecentFilter("filtros inválidos"))),
		};

		const response = await get(makeApp(service), "/hospitalizations/recent?term=a");

		assertEquals(response?.status, 400);
	});

	await t.step("sem token é 401 (rota autenticada)", async () => {
		const app = new Application();
		app.use(authMiddleware({} as AuthService));
		app.use(
			hospitalizationsRouter(
				{ findRecent: () => Promise.resolve(right([])) } as unknown as HospitalizationService,
			).routes(),
		);

		const response = await get(app, "/hospitalizations/recent?term=loki");

		assertEquals(response?.status, 401);
	});
});
