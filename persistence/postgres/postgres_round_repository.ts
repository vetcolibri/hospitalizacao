import { Client } from "deps";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";
import { ID } from "shared/id.ts";
import { ParameterBuilder, ParameterModel } from "./parameters_builder.ts";

interface RoundMeasurementModel extends ParameterModel {
	round_id: string;
	system_id: string;
	hospitalization_id: string;
}

export class PostgresRoundRepository implements RoundRepository {
	constructor(private client: Client) {}

	/**
	 * Rondas e respectivas medições de UM episódio, filtradas directamente por
	 * `hospitalization_id` (usa o índice `idx_rounds_hospitalization`). As
	 * medições vem no mesmo SELECT, evitando uma query por ronda.
	 */
	async findAllByHospitalizationId(hospitalizationId: ID): Promise<Round[]> {
		const result = await this.client.queryObject<RoundMeasurementModel>(
			`SELECT rounds.round_id, rounds.system_id, rounds.hospitalization_id,
					measurements.name, measurements.value, measurements.issued_at
			 FROM rounds
			 LEFT JOIN measurements ON measurements.round_id = rounds.round_id
			 WHERE rounds.hospitalization_id = $HOSPITALIZATION_ID
			 ORDER BY rounds.round_id, measurements.issued_at`,
			{ hospitalization_id: hospitalizationId.value },
		);

		const grouped = new Map<string, RoundMeasurementModel[]>();

		for (const row of result.rows) {
			const rows = grouped.get(row.round_id) ?? [];
			rows.push(row);
			grouped.set(row.round_id, rows);
		}

		const rounds: Round[] = [];

		for (const [roundId, rows] of grouped) {
			const first = rows[0];
			const round = new Round(
				ID.fromString(first.system_id),
				ID.fromString(first.hospitalization_id),
				ID.fromString(roundId),
			);

			const builder = new ParameterBuilder();

			for (const row of rows) {
				if (row.name == null) continue;

				builder
					.withHeartRate(row)
					.withRespiratoryRate(row)
					.withTrc(row)
					.withAvdn(row)
					.withMucosas(row)
					.withTemperature(row)
					.withBloodGlucose(row)
					.withHct(row)
					.withBloodPressure(row);
			}

			for (const parameter of builder.build()) round.add(parameter);

			rounds.push(round);
		}

		return rounds.sort((a, b) => roundIssuedAt(b) - roundIssuedAt(a));
	}

	async save(round: Round): Promise<void> {
		await this.client.queryObject(
			"INSERT INTO rounds (system_id, round_id, hospitalization_id) VALUES ($1, $2, $3)",
			[
				round.patientId.value,
				round.roundId.value,
				round.hospitalizationId.value,
			],
		);

		for (const parameter of round.parameters) {
			await this.client.queryObject(
				"INSERT INTO measurements (round_id, name, value, issued_at) VALUES ($1, $2, $3, $4)",
				[
					round.roundId.value,
					parameter.name,
					parameter.measurement.toString(),
					parameter.issuedAt.toISOString(),
				],
			);
		}
	}

	last(): Promise<Round> {
		throw new Error("Method not implemented.");
	}
}

function roundIssuedAt(round: Round): number {
	let latest = 0;

	for (const parameter of round.parameters) {
		const issuedAt = parameter.issuedAt.getTime();
		if (issuedAt > latest) latest = issuedAt;
	}

	return latest;
}
