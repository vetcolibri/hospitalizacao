import { DB } from "../../deps.ts";

const db = new DB("db.sqlite3");

const url = new URL("./schema.sql", import.meta.url);

const schema = await Deno.readTextFile(url);

db.execute(schema);

db.close();
