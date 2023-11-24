import { SQLiteAlertRepository } from "../../adaptors/persistence/sqlite_alert_repository.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { alert1, patient1 } from "../fake_data.ts";
import { assertEquals } from "../../dev_deps.ts";
import { ID } from "../../domain/id.ts";
import { DB } from "../../deps.ts";

Deno.test("SQLite - Alert Repository", async (t) => {
	await t.step("Deve recuperar os alertas de um paciente", async () => {
		const patientId = ID.New("some-patient-id");
		const persistence = await init_test_db();

		const alerts = await persistence.findAll(patientId);

		assertEquals(alerts.length, 1);
		assertEquals(alerts[0].patient.patientId, patientId);
		assertEquals(alerts[0].parameters.length, 3);
	});
});

async function init_test_db() {
	const path = new URL("../../adaptors/persistence/schema.sql", import.meta.url);

	const schema = await Deno.readTextFile(path);

	const persistence = new SQLiteAlertRepository("test.db", { memory: true });

	const db = persistence.db;

	db.execute(schema);

	populate(db);

	return persistence;
}

function populate(db: DB) {
	const alert = alert1.value as Alert;

	const insert_owner = `INSERT INTO owners (
			owner_id,
			owner_name,
			phone_number
		)
		VALUES (
			'${patient1.owner.ownerId.getValue()}',
			'${patient1.owner.name}',
			'${patient1.owner.phoneNumber}'
		)`;

	const insert_patient = `INSERT INTO patients (
			patient_id,
			name,
			specie,
			breed,
			status,
			birth_date,
			owner_id
		) 
		VALUES (
			'${patient1.patientId.getValue()}',
			'${patient1.name}',
			'${patient1.specie}',
			'${patient1.breed}',
			'${patient1.status}',
			'${patient1.birthDate.value.toISOString()}',
			'${patient1.owner.ownerId.getValue()}'
		)
	`;

	const insert_alert = `INSERT INTO alerts (
			alert_id,
			patient_id,
			parameters,
			repeat_every,
			time,
			comments,
			status
		)  VALUES (
			'${alert.alertId.getValue()}',
			'${alert.patient.patientId.getValue()}',
			'${JSON.stringify(alert.parameters.join(","))}',
			'${alert.repeatEvery.getValue()}',
			'${alert.time.toISOString()}',
			'${alert.comments}',
			'${alert.status}'
		)
	`;

	db.execute(insert_owner);

	db.execute(insert_patient);

	db.execute(insert_alert);
}
