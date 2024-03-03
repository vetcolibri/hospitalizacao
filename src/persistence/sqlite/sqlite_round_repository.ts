import { RoundRepository } from "domain/rounds/round_repository.ts";
import { Parameter, PARAMETER_NAMES } from "domain/parameters/parameter.ts";
import { Round } from "domain/rounds/round.ts";
import { ID } from "shared/id.ts";
import { DB } from "deps";
import { ParametersBuilder } from "./parameters_builder.ts";

export class SQLiteRoundRepository implements RoundRepository {
	readonly #db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	save(round: Round): Promise<void> {
		this.#db.query("INSERT INTO rounds (system_id, round_id) VALUES (?, ?)", [
			round.patient.systemId.value,
			round.roundId.value,
		]);

		round.parameters.forEach((parameter: Parameter) => {
			this.#db.query(
				"INSERT INTO measurements (round_id, name, value, issued_at) VALUES (?, ?, ?, ?)",
				[
					round.roundId.value,
					parameter.name,
					String(parameter.measurement.value),
					parameter.issuedAt.toISOString(),
				],
			);
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
            JOIN patients ON patients.system_id = rounds.system_id 
            WHERE patients.system_id = :patientId
        `;
		const rows = this.#db.queryEntries(sql, { patientId: patientId.value });

		let parameters: Parameter[] = [];
		const builder = new ParametersBuilder();

		for (const name of Object.values(PARAMETER_NAMES)) {
			const row = rows.findLast((row) => row.name === name) ?? {};
			const parametersBuilder = builder
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
			parameters = parametersBuilder;
		}
		return Promise.resolve(parameters);
	}

	measurements(patientId: ID): Promise<Parameter[]> {
		const sql = `
            SELECT measurements.name as name, value, issued_at FROM measurements
            JOIN rounds ON rounds.round_id = measurements.round_id
            JOIN patients ON patients.system_id = rounds.system_id 
            WHERE patients.system_id = :patientId
        `;

		const rows = this.#db.queryEntries(sql, { patientId: patientId.value });

		let parameters: Parameter[] = [];

		const builder = new ParametersBuilder();

		rows.forEach((row) => {
			const parametersBuilder = builder
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

			parameters = parametersBuilder;
		});

		return Promise.resolve(parameters.reverse());
	}
}
