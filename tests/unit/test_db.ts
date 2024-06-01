import { HospitalizationStatus } from "../../src/domain/patients/hospitalizations/hospitalization.ts";
import { appyMigrations } from "persistence/sqlite/sqlite_db_factory.ts";
import { alert1, budgetData, owner, patientData, PATIENTS } from "../fake_data.ts";
import { DB } from "deps";

export async function init_test_db(): Promise<DB> {
	const path = new URL(
		"../../src/persistence/sqlite/schema.sql",
		import.meta.url,
	);

	const schema = await Deno.readTextFile(path);

	const db = new DB("test.db", { memory: true });

	db.execute(schema);

	appyMigrations(db);

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
			'${PATIENTS.hospitalized["1918BA"].systemId.value}',
			'${PATIENTS.hospitalized["1918BA"].patientId.value}',
			'${patientData.name}',
			'${patientData.specie}',
			'${patientData.breed}',
			'${patientData.status}',
			'${patientData.birthDate}',
			'${patientData.ownerId}'
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
			'${PATIENTS.hospitalized["1919BA"].systemId.value}',
			'${"some-id"}',
			'${patientData.name}',
			'${patientData.specie}',
			'${patientData.breed}',
			'${patientData.status}',
			'${patientData.birthDate}',
			'${patientData.ownerId}'
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
			'${patientData.name}',
			'${patientData.specie}',
			'${patientData.breed}',
			'${"ALTA MEDICA"}',
			'${patientData.birthDate}',
			'${patientData.ownerId}'
		)
	`;

	const insert_patient_3 = `INSERT INTO patients (
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
			'${"patient-19200BA"}',
			'${"192000BA"}',
			'${patientData.name}',
			'${patientData.specie}',
			'${patientData.breed}',
			'${"ALTA MEDICA"}',
			'${patientData.birthDate}',
			'${patientData.ownerId}'
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
			'${PATIENTS.hospitalized["1918BA"].systemId.value}'
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
			system_id
		)  VALUES (
			'${16.5}',
			'${new Date().toISOString()}',
			'${new Date().toISOString()}',
			'${JSON.stringify(["some-complaints"].join(","))}',
			'${JSON.stringify(["some-diagnostics"].join(","))}',
			'${HospitalizationStatus.Close}',
			'${"some-hospitalization-id-2"}',
			'${"patient-19200BA"}'
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

	const insert_budget = `INSERT INTO budgets (
			hospitalization_id,
			start_on,
			end_on,
			status,
			budget_id
		)  VALUES (
			'${"some-hospitalization-id"}',
			'${budgetData.startOn}',
			'${budgetData.endOn}',
			'${budgetData.status}',
			'${"some-budget-id"}'
		)
	`;

	db.execute(insert_owner);

	db.execute(insert_patient);

	db.execute(insert_patient_1);

	db.execute(insert_patient_2);

	db.execute(insert_patient_3);

	db.execute(insert_hospitalization);

	db.execute(insert_hospitalization_1);

	db.execute(insert_budget);

	db.execute(insert_alert);
}
