import { assertEquals } from "dev_deps";
import { Application } from "deps";
import { HospitalizationService } from "application/hospitalization_service.ts";
import hospitalizationsRouter from "infra/http/hospitalizations_router.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationBuilder } from "domain/hospitalization/hospitalization_builder.ts";

/**
 * RF-13 — a listagem usada pelo painel tem de expor a excepção do episódio,
 * senão a partilha e os detalhes nunca conseguiriam resolver o contacto efectivo.
 */

const CONTACT = { name: "Maria José", phoneNumber: "923456789", whatsapp: false };

function build(withContact: boolean): Hospitalization {
	const builder = new HospitalizationBuilder()
		.withPatientId("sys-1")
		.withEntryDate("2026-02-01")
		.withWeight(11.5)
		.withComplaints(["Queixa 1"])
		.withDiagnostics(["Diagnostico 1"]);

	if (withContact) builder.withContact(CONTACT);

	const result = builder.build();
	if (result.isLeft()) throw result.value;
	return result.value;
}

function makeApp(hospitalizations: Hospitalization[]) {
	const service = {
		findAllOpen: () => Promise.resolve(hospitalizations),
	} as unknown as HospitalizationService;

	const app = new Application();
	app.use(hospitalizationsRouter(service).routes());
	return app;
}

Deno.test("RF-13 - listagem de hospitalizações expõe a excepção do episódio", async (t) => {
	await t.step("episódio com excepção devolve o contacto específico", async () => {
		const app = makeApp([build(true)]);

		const response = await app.handle(new Request("http://localhost/hospitalizations/"));
		const body = await response?.json();

		assertEquals(response?.status, 200);
		assertEquals(body[0].contact, CONTACT);
	});

	await t.step("episódio sem excepção não inventa contacto", async () => {
		const app = makeApp([build(false)]);

		const response = await app.handle(new Request("http://localhost/hospitalizations/"));
		const body = await response?.json();

		assertEquals(response?.status, 200);
		assertEquals("contact" in body[0], false);
	});
});
