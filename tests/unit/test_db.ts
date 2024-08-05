import { DB } from "deps";
import { HospitalizationStatus } from "domain/hospitalization/hospitalization.ts";
import { alert1, budgetData, owner, patientData, PATIENTS } from "../fake_data.ts";

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

function appyMigrations(db: DB) {
	_MIGRATIONS_FILES.forEach((file) => {
		const path = buildPath(file);

		const data = Deno.readTextFileSync(path);

		try {
			db.execute(data);
		} catch (error) {
			console.error(`Error applying migration: ${file}`);
			console.error(error);
		}
	});
}

function buildPath(file: string): URL {
	const path = `../../src/persistence/sqlite/migrations/${file}`;
	return new URL(path, import.meta.url);
}

const _MIGRATIONS_FILES = [
	"1_migration.sql",
	"2_migration.sql",
];

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

	const insert_patient_4 = `INSERT INTO patients (
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
			'${HospitalizationStatus.Open}',
			'${"some-hospitalization-id"}',
			'${PATIENTS.hospitalized["1918BA"].systemId.value}'
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

	const insert_report_1 = `
		INSERT INTO reports (
			report_id,
			system_id,
			state_of_consciousness,
			food_types,
			food_level,
			food_date,
			created_at,
			comments
		)
		VALUES (
			'${"1"}',
			'${PATIENTS.hospitalized["1918BA"].systemId.value}',
			'${JSON.stringify(["some-state-of-consciousness"].join(","))}',
			'${JSON.stringify(["some-food-type"].join(","))}',
			'${"some-food-level"}',
			'${new Date().toISOString()}',
			'${new Date().toISOString()}',
			'${"some-comments"}'
		)

	`;

	const insert_report_2 = `
		INSERT INTO reports (
			report_id,
			system_id,
			state_of_consciousness,
			food_types,
			food_level,
			food_date,
			created_at,
			comments
		)
		VALUES (
			'${"2"}',
			'${PATIENTS.hospitalized["1918BA"].systemId.value}',
			'${JSON.stringify(["some-state-of-consciousness"].join(","))}',
			'${JSON.stringify(["some-food-type"].join(","))}',
			'${"some-food-level"}',
			'${new Date().toISOString()}',
			'${new Date().toISOString()}',
			'${"some-comments"}'
		)`;

	const insert_discharge_1 = `INSERT INTO discharges (
			report_id,
			type,
			aspects
		)
		VALUES (
			'${"1"}',
			'${"Fezes"}',
			'${JSON.stringify(["Sangue", "Normal"].join(","))}'
		)
	`;

	const insert_discharge_2 = `INSERT INTO discharges (
			report_id,
			type,
			aspects
		)
		VALUES (
			'${"1"}',
			'${"Urina"}',
			'${JSON.stringify(["Normal"].join(","))}'
		)
	`;

	db.execute(insert_owner);

	db.execute(insert_patient_1);

	db.execute(insert_patient_2);

	db.execute(insert_patient_3);

	db.execute(insert_patient_4);

	db.execute(insert_hospitalization_1);

	db.execute(insert_hospitalization_2);

	db.execute(insert_budget);

	db.execute(insert_alert);

	db.execute(insert_report_1);

	db.execute(insert_report_2);

	db.execute(insert_discharge_1);

	db.execute(insert_discharge_2);
}
