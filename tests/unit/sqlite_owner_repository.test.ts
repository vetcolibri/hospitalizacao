import { assertEquals } from "dev_deps";
import { Owner } from "domain/patients/owners/owner.ts";
import { ID } from "shared/id.ts";
import { init_test_db, populate } from "./test_db.ts";
import { SQLiteOwnerRepository } from "../../src/persistence/sqlite/sqlite_owner_repository.ts";

Deno.test("SQLite - Owner Repository", async (t) => {
	await t.step("Deve recuperar o Dono do paciente.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteOwnerRepository(db);

		const ownerOrErr = await repository.getById(ID.fromString("1001"));

		const owner = <Owner> ownerOrErr.value;

		assertEquals(ownerOrErr.isRight(), true);

		assertEquals(owner.ownerId.value, "1001");
	});

	await t.step(
		"Deve retornar @OwnerNotFound se o dono não existir.",
		async () => {
			const db = await init_test_db();

			populate(db);

			const repository = new SQLiteOwnerRepository(db);

			const ownerOrErr = await repository.getById(ID.fromString("18927BD"));

			assertEquals(ownerOrErr.isLeft(), true);
		},
	);

	await t.step("Deve salvar um dono.", async () => {
		const db = await init_test_db();

		const repository = new SQLiteOwnerRepository(db);

		await repository.save(newOwner);

		const ownerOrErr = await repository.getById(ID.fromString("1991AB"));

		const owner = <Owner> ownerOrErr.value;

		assertEquals(owner.ownerId.value, "1991AB");
		assertEquals(owner.name, "John Doe");
		assertEquals(owner.phoneNumber, "555-5555");
	});

	await t.step("Deve listar os proprietários.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteOwnerRepository(db);

		const owners = await repository.getAll();

		assertEquals(owners.length, 1);
	});
});

const newOwner = new Owner("1991AB", "John Doe", "555-5555");
