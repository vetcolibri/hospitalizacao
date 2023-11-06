import { ID } from "../id.ts";
import { Parameter } from "../parameters/parameter.ts";
import { Round } from "./round.ts";

export interface RoundRepository {
	save(round: Round): Promise<void>;
	last(): Promise<Round>;
	latestMeasurements(patientId: ID): Promise<Parameter[]>;
	measurements(patientId: ID): Promise<Parameter[]>;
}
