import { HospitalizationStatus } from "../../src/domain/patients/hospitalizations/hospitalization.ts";
import { alert1, owner, patient1, patient2 } from "../fake_data.ts";
import { DB } from "deps";

export async function init_test_db(): Promise<DB> {
	const path = new URL(
		"../../src/persistence/sqlite/schema.sql",
		import.meta.url,
	);

	const schema = await Deno.readTextFile(path);

	const db = new DB("test.db", { memory: true });

	db.execute(schema);

	return db;
}

export function populate(db: DB) {
	const insert_owner = `INSERT INTO owners (
			owner_id,
			owner_name,
			phone_number
		)
		VALUES (
			'${owner.ownerId.value}',
			'${owner.name}',
			'${owner.phoneNumber}'
		)`;

	const insert_patient = `INSERT INTO patients (
			system_id,
			patient_id,
			name,
			specie,
			breed,
			status,
			birth_date,
			owner_id
		) 
		VALUES (
			'${patient1.systemId.value}',
			'${patient1.patientId.value}',
			'${patient1.name}',
			'${patient1.specie}',
			'${patient1.breed}',
			'${patient1.status}',
			'${patient1.birthDate.value.toISOString()}',
			'${patient1.ownerId.value}'
		)
	`;

	const insert_patient_1 = `INSERT INTO patients (
			system_id,
			patient_id,
			name,
			specie,
			breed,
			status,
			birth_date,
			owner_id
		) 
		VALUES (
			'${patient2.systemId.value}',
			'${"some-id"}',
			'${patient1.name}',
			'${patient1.specie}',
			'${patient1.breed}',
			'${patient1.status}',
			'${patient1.birthDate.value.toISOString()}',
			'${patient1.ownerId.value}'
		)
	`;

	const insert_patient_2 = `INSERT INTO patients (
			system_id,
			patient_id,
			name,
			specie,
			breed,
			status,
			birth_date,
			owner_id
		)
		VALUES (
			'${"some-id"}',
			'${"some-fake-patient-id"}',
			'${patient1.name}',
			'${patient1.specie}',
			'${patient1.breed}',
			'${"ALTA MEDICA"}',
			'${patient1.birthDate.value.toISOString()}',
			'${patient1.ownerId.value}'
		)
	`;

	const insert_hospitalization = `INSERT INTO hospitalizations (
			weight,
			entry_date,
			discharge_date,
			complaints,
			diagnostics,
			status,
			hospitalization_id,
			system_id
		)  VALUES (
			'${16.5}',
			'${new Date().toISOString()}',
			'${new Date().toISOString()}',
			'${JSON.stringify(["some-complaints"].join(","))}',
			'${JSON.stringify(["some-diagnostics"].join(","))}',
			'${HospitalizationStatus.Open}',
			'${"some-hospitalization-id"}',
			'${patient1.systemId.value}'
		)
	`;

	const insert_alert = `INSERT INTO alerts (
			alert_id,
			system_id,
			parameters,
			repeat_every,
			time,
			comments,
			status
		)  VALUES (
			'${alert1.alertId.value}',
			'${alert1.patientId.value}',
			'${JSON.stringify(alert1.parameters.join(","))}',
			'${alert1.repeatEvery}',
			'${alert1.time}',
			'${alert1.comments}',
			'${alert1.status}'
		)
	`;

	db.execute(insert_owner);

	db.execute(insert_patient);

	db.execute(insert_patient_1);

	db.execute(insert_patient_2);

	db.execute(insert_hospitalization);

	db.execute(insert_alert);
}
