import { InmemOwnerRepository } from "persistence/inmem/inmem_owner_repository.ts";
import { assertEquals, assertInstanceOf } from "dev_deps";
import { Owner } from "domain/patients/owners/owner.ts";
import { OwnerService } from "../../src/application/owner_service.ts";
import { OwnerNotFound } from "../../src/domain/patients/owners/owner_not_found_error.ts";

Deno.test("Owner Service - List Owners", async (t) => {
	await t.step("Deve recuperar os proprietários do repositório", async () => {
		const repository = new InmemOwnerRepository();
		await repository.save(john);
		const service = new OwnerService(repository);

		const owners = await service.getAll();

		assertEquals(owners.length, 1);
	});

	await t.step("Deve retornar uma lista vazia se não houver proprietários", async () => {
		const repository = new InmemOwnerRepository();
		const service = new OwnerService(repository);

		const owners = await service.getAll();

		assertEquals(owners.length, 0);
		assertEquals(owners, []);
	});
});

Deno.test("Owner Service - Find Owner", async (t) => {
	await t.step(
		"Deve recuperar o dono do paciente se ele existir no repositório.",
		async () => {
			const repository = new InmemOwnerRepository();
			const service = new OwnerService(repository);
			await repository.save(john);

			const ownerOrErr = await service.findOwner("1001");

			const owner = <Owner> ownerOrErr.value;

			assertEquals(owner.ownerId.value, "1001");
			assertEquals(owner.name, "John");
			assertEquals(owner.phoneNumber, "933001122");
		},
	);
	await t.step(
		"Deve retornar @OwnerNotFound se o dono não existir no repositório.",
		async () => {
			const repository = new InmemOwnerRepository();
			const service = new OwnerService(repository);

			const error = await service.findOwner("1002");

			assertEquals(error.isLeft(), true);
			assertInstanceOf(error.value, OwnerNotFound);
		},
	);
});

const john = new Owner("1001", "John", "933001122");
