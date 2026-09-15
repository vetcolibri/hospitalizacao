import { assertEquals } from "dev_deps";
import { Context } from "deps";
import { AuthService } from "application/auth_service.ts";
import { authMiddleware } from "infra/http/auth_middleware.ts";
import { Role } from "domain/auth/user.ts";
import { right } from "shared/either.ts";

/**
 * RF-15 — o histórico é da equipa autenticada. Não está na lista de excepções
 * do tutor nem pode ser consultado sem um token válido.
 */

const HISTORY_URLS = [
	"http://localhost/patients/sys-1/hospitalizations",
	"http://localhost/patients/sys-1/hospitalizations/hosp-1",
	"http://localhost/patients/sys-1/legacy-link-status",
];

function makeContext(url: string, token?: string): Context {
	return {
		request: {
			url: new URL(url),
			headers: new Headers(token ? { "X-Access-Token": token } : {}),
		},
		response: {},
		state: {},
	} as unknown as Context;
}

Deno.test("RF-15 - histórico exige autenticação", async (t) => {
	for (const url of HISTORY_URLS) {
		await t.step(`sem token é 401: ${url}`, async () => {
			let nextCalled = false;
			const ctx = makeContext(url);

			await authMiddleware({} as AuthService)(ctx, () => {
				nextCalled = true;
			});

			assertEquals(ctx.response.status, 401);
			assertEquals(nextCalled, false);
		});
	}

	await t.step("com token válido a equipa autenticada passa", async () => {
		let nextCalled = false;
		const ctx = makeContext(HISTORY_URLS[0], "valid-token");
		const service = {
			verifyToken: () => Promise.resolve(right({ username: "medvet1", role: Role.MedVet })),
		} as unknown as AuthService;

		await authMiddleware(service)(ctx, () => {
			nextCalled = true;
		});

		assertEquals(nextCalled, true);
		assertEquals(ctx.state.username, "medvet1");
	});
});
