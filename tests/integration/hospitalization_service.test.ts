import { assertEquals } from "dev_deps";
import { Hospitalization } from "domain/patients/hospitalizations/hospitalization.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";
import { HospitalizationService } from "../../src/application/hospitalization_service.ts";
import { ID } from "shared/id.ts";

Deno.test("Hospitalization Service - Get All opened hospitalizations", async (t) => {
	await t.step(
		"Deve retornar uma lista vazia se não existirem hospitalizações abertas",
		async () => {
			const hospitalizationRepository = new InmemHospitalizationRepository();

			const service = new HospitalizationService(hospitalizationRepository);

			const hospitalizations = await service.getAllOpened();

			assertEquals(hospitalizations.length, 0);

			assertEquals(hospitalizations, []);
		},
	);

	await t.step("Deve recuperar apenas as hospitalizações activas", async () => {
		const hospitalizationRepository = new InmemHospitalizationRepository();
		await hospitalizationRepository.save(hospitalization);
		await hospitalizationRepository.save(hospitalization1);

		const service = new HospitalizationService(hospitalizationRepository);

		const hospitalizations = await service.getAllOpened();

		assertEquals(hospitalizations.length, 1);
	});
});

const hospitalization = new Hospitalization(
	ID.random(),
	"1919GB",
	45,
	["Queixa 1"],
	["Diagnostico 1"],
	"2024-04-10",
);

const hospitalization1 = new Hospitalization(
	ID.random(),
	"1918GB",
	45,
	["Queixa 1"],
	["Diagnostico 1"],
	"2024-04-10",
);

hospitalization1.close();
