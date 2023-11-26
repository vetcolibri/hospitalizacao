import { DB } from "../../deps.ts";


export async function init_test_db(): Promise<DB> {
	const path = new URL("../../adaptors/persistence/schema.sql", import.meta.url);

	const schema = await Deno.readTextFile(path);

	const db = new DB("test.db", { memory: true });

	db.execute(schema);

	return db;
}