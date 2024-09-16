import { Client } from "deps";
import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";

export class PostgresRoundRepository implements RoundRepository {
	constructor(private client: Client) {}

	async save(round: Round): Promise<void> {
		await this.client.queryObject("INSERT INTO rounds (system_id, round_id) VALUES ($1, $2)", [
			round.patientId.value,
			round.roundId.value,
		]);

		const query = "INSERT INTO measurements (round_id, name, value, issued_at) VALUES $VALUES";
		const values = round.parameters.map((parameter: Parameter) => {
			return `(${round.roundId.value}, ${parameter.name}, ${parameter.measurement.toString()}, ${parameter.issuedAt.toISOString()})`;
		}).join(",");

		await this.client.queryObject(query, { values });
	}

	last(): Promise<Round> {
		throw new Error("Method not implemented.");
	}
}
