import { DB } from "deps";
import { initSQLiteDB } from "./init_db.ts";

export function createSQLiteDB(path: string): DB {
	const db = new DB(path);
	const data = Deno.readFileSync(path);

	if (data.byteLength === 0) {
		console.log("Creating new database.");
		initSQLiteDB(db);
	}

	return db;
}
