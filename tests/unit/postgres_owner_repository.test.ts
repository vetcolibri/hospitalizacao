import { assertEquals } from "dev_deps";
import { Client } from "deps";
import { Owner } from "domain/crm/owner/owner.ts";
import { PostgresOwnerRepository } from "persistence/postgres/postgres_owner_repository.ts";
import { ID } from "shared/id.ts";

function makeClient(rows: Record<string, unknown>[] = []) {
	const calls: { sql: string; values: Record<string, unknown> }[] = [];
	const client = {
		queryObject(sql: string, values: Record<string, unknown>) {
			calls.push({ sql, values });
			return Promise.resolve({ rows });
		},
	} as unknown as Client;

	return { client, calls };
}

Deno.test("editing an owner locks its row until the end of the transaction", async () => {
	const { client, calls } = makeClient();

	await new PostgresOwnerRepository(client).lockById(ID.fromString("OWN-1"));

	assertEquals(calls.length, 1, "Deve executar uma única consulta.");
	assertEquals(calls[0].sql.includes("WHERE owner_id = $OWNER_ID FOR UPDATE"), true);
	assertEquals(calls[0].values, { owner_id: "OWN-1" });
});

Deno.test("editing an owner updates only name, phone and whatsapp", async () => {
	const { client, calls } = makeClient();

	await new PostgresOwnerRepository(client).update(
		new Owner("OWN-1", "Novo Nome", "923456789", false),
	);

	assertEquals(calls.length, 1, "Deve executar uma única consulta.");
	const sql = calls[0].sql;
	assertEquals(sql.includes("UPDATE owners SET"), true);
	assertEquals(sql.includes("name = $NAME"), true);
	assertEquals(sql.includes("phone_number = $PHONE_NUMBER"), true);
	assertEquals(sql.includes("whatsapp = $WHATSAPP"), true);
	assertEquals(sql.includes("WHERE owner_id = $OWNER_ID"), true);
	assertEquals(calls[0].values, {
		name: "Novo Nome",
		phone_number: "923456789",
		whatsapp: false,
		owner_id: "OWN-1",
	});
});
