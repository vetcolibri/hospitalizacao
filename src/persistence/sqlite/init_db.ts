import { DB } from "deps";

export function initSQLiteDB(db: DB) {
  const url = new URL("./schema.sql", import.meta.url);

  const schema = Deno.readTextFileSync(url);

  db.execute(schema);

}
