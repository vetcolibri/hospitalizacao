import { assertEquals } from "dev_deps";
import { Owner } from "domain/crm/owner/owner.ts";
import { SQLiteOwnerRepository } from "persistence/sqlite/sqlite_owner_repository.ts";
import { ID } from "shared/id.ts";
import { init_test_db, populate } from "./test_db.ts";

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
		assertEquals(owner.phoneNumber, "911000000");
	});

	await t.step("Deve salvar o dono com WhatsApp.", async () => {
		const db = await init_test_db();

		const repository = new SQLiteOwnerRepository(db);

		const owner = new Owner("1991AB", "John Doe", "911000000", true);

		await repository.save(owner);

		const ownerOrErr = await repository.getById(ID.fromString("1991AB"));

		const savedOwner = <Owner> ownerOrErr.value;

		assertEquals(savedOwner.whatsapp, true);
	});

	await t.step("Deve salvar o dono sem WhatsApp.", async () => {
		const db = await init_test_db();

		const repository = new SQLiteOwnerRepository(db);

		const owner = new Owner("1991AB", "John Doe", "911000000", false);

		await repository.save(owner);

		const ownerOrErr = await repository.getById(ID.fromString("1991AB"));

		const savedOwner = <Owner> ownerOrErr.value;

		assertEquals(savedOwner.whatsapp, false);
	});

	await t.step("Deve listar os proprietários.", async () => {
		const db = await init_test_db();

		populate(db);

		const repository = new SQLiteOwnerRepository(db);

		const owners = await repository.getAll();

		assertEquals(owners.length, 1);
	});
});

const newOwner = new Owner("1991AB", "John Doe", "911000000");
