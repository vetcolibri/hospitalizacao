import { HospitalizationStatus } from "../../domain/patients/hospitalization.ts";
import { Alert } from "../../domain/alerts/alert.ts";
import { alert1, patient1 } from "../fake_data.ts";
import { DB } from "../../deps.ts";


export async function init_test_db(): Promise<DB> {
	const path = new URL("../../adaptors/persistence/schema.sql", import.meta.url);

	const schema = await Deno.readTextFile(path);

	const db = new DB("test.db", { memory: true });

	db.execute(schema);

	return db;
}



export function populate(db: DB) {
	const testAlert = <Alert>alert1.value;

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


	const insert_patient_1 = `INSERT INTO patients (
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
			'${patient1.name}',
			'${patient1.specie}',
			'${patient1.breed}',
			'${patient1.status}',
			'${patient1.birthDate.value.toISOString()}',
			'${patient1.owner.ownerId.getValue()}'
		)
	`;

	const insert_patient_2 = `INSERT INTO patients (
			patient_id,
			name,
			specie,
			breed,
			status,
			birth_date,
			owner_id
		) 
		VALUES (
			'${"some-fake-patient-id"}',
			'${patient1.name}',
			'${patient1.specie}',
			'${patient1.breed}',
			'${"ALTA MEDICA"}',
			'${patient1.birthDate.value.toISOString()}',
			'${patient1.owner.ownerId.getValue()}'
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
			patient_id
		)  VALUES (
			'${16.5}',
			'${new Date().toISOString()}',
			'${new Date().toISOString()}',
			'${JSON.stringify(["some-complaints"].join(","))}',
			'${JSON.stringify(["some-diagnostics"].join(","))}',
			'${HospitalizationStatus.OPEN}',
			'${"some-hospitalization-id"}',
			'${"some-patient-id"}'
		)
	`;

	const insert_hospitalization_1 = `INSERT INTO hospitalizations (
			weight,
			entry_date,
			discharge_date,
			complaints,
			diagnostics,
			status,
			hospitalization_id,
			patient_id
		)  VALUES (
			'${19.5}',
			'${new Date().toISOString()}',
			'${new Date().toISOString()}',
			'${JSON.stringify(["some-complaints"].join(","))}',
			'${JSON.stringify(["some-diagnostics"].join(","))}',
			'${HospitalizationStatus.OPEN}',
			'${"some-dummy-id"}',
			'${"some-patient-id"}'
		)
	`;


	const insert_hospitalization_2 = `INSERT INTO hospitalizations (
			weight,
			entry_date,
			discharge_date,
			complaints,
			diagnostics,
			status,
			hospitalization_id,
			patient_id
		)  VALUES (
			'${9.5}',
			'${new Date().toISOString()}',
			'${new Date().toISOString()}',
			'${JSON.stringify(["some-complaints"].join(","))}',
			'${JSON.stringify(["some-diagnostics"].join(","))}',
			'${HospitalizationStatus.OPEN}',
			'${"some-xpto-id"}',
			'${"some-fake-patient-id"}'
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
			'${testAlert.alertId.getValue()}',
			'${testAlert.patient.patientId.getValue()}',
			'${JSON.stringify(testAlert.parameters.join(","))}',
			'${testAlert.repeatEvery.getValue()}',
			'${testAlert.time.toISOString()}',
			'${testAlert.comments}',
			'${testAlert.status}'
		)
	`;

	db.execute(insert_owner);

	db.execute(insert_patient);

	db.execute(insert_patient_1);

	db.execute(insert_patient_2);

	db.execute(insert_hospitalization);

	db.execute(insert_hospitalization_1);

	db.execute(insert_hospitalization_2);

	db.execute(insert_alert);
}
