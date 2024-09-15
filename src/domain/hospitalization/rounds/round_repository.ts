import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { ID } from "shared/id.ts";

export interface RoundRepository {
	save(round: Round): Promise<void>;
	last(): Promise<Round>;
	latestMeasurements(patientId: ID): Promise<Parameter[]>;
	measurements(patientId: ID): Promise<Parameter[]>;
}
