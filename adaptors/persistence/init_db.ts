import { DB } from "../../deps.ts";


const url = new URL("./schema.sql", import.meta.url);

const schema = await Deno.readTextFile(url);

const db = new DB("db.sqlite3");

db.execute(schema);

db.close();
