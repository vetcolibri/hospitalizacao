import { assertEquals } from "dev_deps";
import { Application, Router, z } from "deps";
import { validate } from "shared/tools.ts";

Deno.test("validation errors identify each invalid field", async () => {
	const app = new Application();
	const router = new Router();
	router.post("/", validate(z.object({ patient: z.object({ name: z.string().min(1) }) })), (ctx) => {
		ctx.response.status = 204;
	});
	app.use(router.routes());

	const response = await app.handle(new Request("http://localhost/", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ patient: { name: "" } }),
	}));
	const body = await response?.json();

	assertEquals(response?.status, 400);
	assertEquals(body.errors[0].path, "patient.name");
	assertEquals(body.errors[0].code, "too_small");
});
