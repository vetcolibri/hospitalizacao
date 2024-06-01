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

export function appyMigrations(db: DB) {
	const url = new URL("./migrations", import.meta.url);
	const files = Deno.readDirSync(url);

	for (const file of files) {
		const path = `${url}/${file.name}`;
		const data = Deno.readTextFileSync(new URL(file.name, path));

		try {
			db.execute(data);
		} catch (error) {
			console.error(`Error applying migration: ${file.name}`);
			console.error(error);
		}
	}
}
