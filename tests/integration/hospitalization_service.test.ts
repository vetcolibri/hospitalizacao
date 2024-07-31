import { assert, assertEquals } from "dev_deps";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { HospitalizationService } from "application/hospitalization_service.ts";
import { HospitalizationRepositoryStub } from "../stubs/hospitalization_repository_stub.ts";

Deno.test("Hospitalization Service - Get all hospitalizations", async (t) => {
	await t.step(
		"Deve retornar uma lista vazia se não existirem hospitalizações",
		async () => {
			const repo = new InmemHospitalizationRepository();

			const service = new HospitalizationService(repo);

			const hospitalizations = await service.getAll();

			assertEquals(hospitalizations.length, 0);

			assertEquals(hospitalizations, []);
		},
	);

	await t.step("Deve recuperar apenas as hospitalizações", async () => {
		const repo = new HospitalizationRepositoryStub();

		const service = new HospitalizationService(repo);

		const hospitalizations = await service.getAll();

		assert(hospitalizations.length > 1);
	});
});
