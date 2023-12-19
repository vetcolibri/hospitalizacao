import { DB } from "deps";
import { initSQLiteDB } from "./init_db.ts";

export function createSQLiteDB(path: string): DB {
  const db = new DB(path);

  initSQLiteDB(db);

  return db;
}
