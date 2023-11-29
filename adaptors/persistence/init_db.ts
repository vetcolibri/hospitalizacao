import {
	Database,
	Relationships,
	SQLite3Connector,
} from "https://deno.land/x/denodb@v1.4.0/mod.ts";

import { Measurement } from "./models/measurement.ts";
import { Alert } from "./models/alert.ts";
import { Budget } from "./models/budget.ts";
import { Hospitalization } from "./models/hospitalization.ts";
import { Owner } from "./models/owner.ts";
import { Patient } from "./models/patient.ts";
import { Round } from "./models/round.ts";

// import { DB } from "../../deps.ts";

// async function initSQLiteDB() {
// 	const url = new URL("./schema.sql", import.meta.url);

// 	const schema = await Deno.readTextFile(url);

// 	const db = new DB("db.sqlite3");

// 	db.execute(schema);

// 	db.close();
// }

// await initSQLiteDB();

async function initDenoDB() {
	const conn = new SQLite3Connector({ filepath: "./denodb.sqlite3" });
	const denoDB = new Database(conn);

	Relationships.belongsTo(Patient, Owner);
	Relationships.belongsTo(Hospitalization, Patient);
	Relationships.belongsTo(Budget, Hospitalization);
	Relationships.belongsTo(Alert, Patient);
	Relationships.belongsTo(Round, Patient);
	Relationships.belongsTo(Measurement, Round);

	denoDB.link([Patient, Hospitalization, Budget, Owner, Alert, Round, Measurement]);

	await denoDB.sync();

	Deno.exit(0);
}

await initDenoDB();
