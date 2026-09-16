import { assertEquals, assertInstanceOf } from "dev_deps";
import { HospitalizationService } from "application/hospitalization_service.ts";
import { InvalidRecentFilter } from "domain/hospitalization/invalid_recent_filter_error.ts";
import { InmemHospitalizationRepository } from "persistence/inmem/inmem_hospitalization_repository.ts";

/**
 * Fase 2 — validação e normalização dos filtros da listagem de internamentos.
 * O repositório é substituído por um registo para provar o que é enviado.
 */

interface ReceivedCall {
	filter: { term?: string; from?: string; to?: string };
	limit: number;
}

class RecordingRepository extends InmemHospitalizationRepository {
	readonly calls: ReceivedCall[] = [];

	override findRecent(
		filter: { term?: string; from?: string; to?: string },
		limit: number,
	): Promise<never[]> {
		this.calls.push({ filter, limit });
		return Promise.resolve([]);
	}
}

function makeService() {
	const repository = new RecordingRepository();
	return { service: new HospitalizationService(repository), repository };
}

Deno.test("últimos internamentos - filtros válidos", async (t) => {
	await t.step("sem filtros lista os recentes", async () => {
		const { service, repository } = makeService();

		const result = await service.findRecent({});

		assertEquals(result.isRight(), true);
		assertEquals(repository.calls, [{ filter: { term: undefined, from: undefined, to: undefined }, limit: 20 }]);
	});

	await t.step("termo com trim, 2 a 50 caracteres", async () => {
		const { service, repository } = makeService();

		await service.findRecent({ term: "  Loki  " });
		await service.findRecent({ term: "ab" });
		await service.findRecent({ term: "a".repeat(50) });

		assertEquals(repository.calls[0].filter.term, "Loki");
		assertEquals(repository.calls[1].filter.term, "ab");
		assertEquals(repository.calls[2].filter.term, "a".repeat(50));
	});

	await t.step("termo vazio conta como sem termo", async () => {
		const { service, repository } = makeService();

		await service.findRecent({ term: "   " });

		assertEquals(repository.calls[0].filter.term, undefined);
	});

	await t.step("from/to válidos são enviados", async () => {
		const { service, repository } = makeService();

		await service.findRecent({ from: "2026-01-01", to: "2026-01-31" });

		assertEquals(repository.calls[0].filter, {
			term: undefined,
			from: "2026-01-01",
			to: "2026-01-31",
		});
	});
});

Deno.test("últimos internamentos - filtros inválidos", async (t) => {
	await t.step("termo com menos de 2 ou mais de 50 caracteres", async () => {
		const { service } = makeService();

		for (const term of ["a", "a".repeat(51)]) {
			const result = await service.findRecent({ term });
			assertEquals(result.isLeft(), true, `termo ${term.length}`);
			assertInstanceOf(result.value, InvalidRecentFilter);
		}
	});

	await t.step("datas fora de YYYY-MM-DD ou inexistentes", async () => {
		const { service } = makeService();

		for (const filters of [
			{ from: "01-01-2026" },
			{ to: "2026-13-01" },
			{ from: "2026-02-30" },
			{ to: "abc" },
		]) {
			const result = await service.findRecent(filters);
			assertEquals(result.isLeft(), true, JSON.stringify(filters));
			assertInstanceOf(result.value, InvalidRecentFilter);
		}
	});

	await t.step("from posterior a to", async () => {
		const { service } = makeService();

		const result = await service.findRecent({ from: "2026-02-01", to: "2026-01-01" });

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, InvalidRecentFilter);
	});
});
