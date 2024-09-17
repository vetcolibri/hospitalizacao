import { Client } from "deps";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";

export class PostgresRoundRepository implements RoundRepository {
	constructor(private client: Client) {}

	async save(round: Round): Promise<void> {
		await this.client.queryObject("INSERT INTO rounds (system_id, round_id) VALUES ($1, $2)", [
			round.patientId.value,
			round.roundId.value,
		]);


		for (const parameter of round.parameters) {
			await this.client.queryObject(
				"INSERT INTO measurements (round_id, name, value, issued_at) VALUES ($1, $2, $3, $4)",
				[round.roundId.value, parameter.name, parameter.measurement.toString(), parameter.issuedAt.toISOString()],
			);
		}

	}

	last(): Promise<Round> {
		throw new Error("Method not implemented.");
	}
}
