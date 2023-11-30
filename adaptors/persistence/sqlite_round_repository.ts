import { RoundRepository } from "../../domain/rounds/round_repository.ts";
import { Parameter, PARAMETER_NAMES } from "../../domain/parameters/parameter.ts";
import { Round } from "../../domain/rounds/round.ts";
import { ID } from "../../domain/id.ts";
import { DB } from "../../deps.ts";
import { ParametersBuilder } from "./parameters_builder.ts";

export class SQLiteRoundRepository implements RoundRepository {
	readonly #db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	save(round: Round): Promise<void> {
		const sql = `INSERT INTO rounds (
            patient_id,
            round_id
        ) VALUES (
            '${round.patient.patientId.getValue()}',
            '${round.roundId.getValue()}'
        )`;

		this.#db.query(sql);

		round.parameters.forEach((parameter: Parameter) => {
			const sql = `INSERT INTO measurements (
                round_id,
                name,
                value,
                issued_at
            ) VALUES (
                '${round.roundId.getValue()}',
                '${parameter.name}',
                '${parameter.measurement.value}',
                '${parameter.issuedAt.toISOString()}'
            )`;

			this.#db.query(sql);
		});

		return Promise.resolve(undefined);
	}

	last(): Promise<Round> {
		throw new Error("Method not implemented.");
	}

	latestMeasurements(patientId: ID): Promise<Parameter[]> {
		const sql = `
            SELECT measurements.name as name, value, issued_at FROM measurements
            JOIN rounds ON rounds.round_id = measurements.round_id
            JOIN patients ON patients.patient_id = rounds.patient_id 
            WHERE patients.patient_id = '${patientId.getValue()}'
        `;
		const rows = this.#db.queryEntries(sql);

		let parameters: Parameter[] = [];
		const builder = new ParametersBuilder();

		for (const name of Object.values(PARAMETER_NAMES)) {
			const row = rows.findLast((row) => row.name === name) ?? {};
			const parametersBuilt = builder
				.withHeartRate(row)
				.withRespiratoryRate(row)
				.withTrc(row)
				.withMucosas(row)
				.withAvdn(row)
				.withTemperature(row)
				.withBloodGlucose(row)
				.withHct(row)
				.withBloodPressure(row)
				.build();
			parameters = parametersBuilt;
		}
		return Promise.resolve(parameters);
	}

	measurements(patientId: ID): Promise<Parameter[]> {
		const sql = `
            SELECT measurements.name as name, value, issued_at FROM measurements
            JOIN rounds ON rounds.round_id = measurements.round_id
            JOIN patients ON patients.patient_id = rounds.patient_id 
            WHERE patients.patient_id = '${patientId.getValue()}'
        `;

		const rows = this.#db.queryEntries(sql);

		let parameters: Parameter[] = [];

		const builder = new ParametersBuilder();

		rows.forEach((row) => {
			const parametersBuilt = builder
				.withHeartRate(row)
				.withRespiratoryRate(row)
				.withTrc(row)
				.withMucosas(row)
				.withAvdn(row)
				.withTemperature(row)
				.withBloodGlucose(row)
				.withHct(row)
				.withBloodPressure(row)
				.build();
			parameters = parametersBuilt;
		});

		return Promise.resolve(parameters);
	}
}
