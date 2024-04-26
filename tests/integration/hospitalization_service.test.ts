import { assertEquals } from "dev_deps";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { HospitalizationService } from "../../src/application/hospitalization_service.ts";
import { HospitalizationRepositoryStub } from "../stubs/hospitalization_repository_stub.ts";

Deno.test("Hospitalization Service - Get All opened hospitalizations", async (t) => {
	await t.step(
		"Deve retornar uma lista vazia se não existirem hospitalizações abertas",
		async () => {
			const repo = new InmemHospitalizationRepository();

			const service = new HospitalizationService(repo);

			const hospitalizations = await service.getAllOpened();

			assertEquals(hospitalizations.length, 0);

			assertEquals(hospitalizations, []);
		},
	);

	await t.step("Deve recuperar apenas as hospitalizações activas", async () => {
		const repo = new HospitalizationRepositoryStub();

		const service = new HospitalizationService(repo);

		const hospitalizations = await service.getAllOpened();

		assertEquals(hospitalizations.length, 5);
	});
});
