import { assertEquals } from "dev_deps";
import { AuthService } from "application/auth_service.ts";
import { InvalidTokenError } from "domain/auth/invalid_token_error.ts";
import { authMiddleware } from "infra/http/auth_middleware.ts";
import { Context } from "deps";
import { left } from "shared/either.ts";

Deno.test("owner reports require authentication", async () => {
	let nextCalled = false;
	const ctx = {
		request: {
			url: new URL("http://localhost/owners/reports?patientId=patient-1"),
			headers: new Headers(),
		},
		response: {},
	} as unknown as Context;

	await authMiddleware({} as AuthService)(ctx, () => {
		nextCalled = true;
	});

	assertEquals(ctx.response.status, 401);
	assertEquals(nextCalled, false);
});

Deno.test("invalid tokens do not authorize owner reports", async () => {
	let nextCalled = false;
	const ctx = {
		request: {
			url: new URL("http://localhost/owners/reports?patientId=patient-1"),
			headers: new Headers({ "X-Access-Token": "invalid" }),
		},
		response: {},
		state: {},
	} as unknown as Context;
	const service = {
		verifyToken: () => Promise.resolve(left(new InvalidTokenError())),
	} as unknown as AuthService;

	await authMiddleware(service)(ctx, () => {
		nextCalled = true;
	});

	assertEquals(ctx.response.status, 401);
	assertEquals(nextCalled, false);
});
