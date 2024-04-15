import { Hospitalization } from "./hospitalization.ts";
import { ID } from "shared/id.ts";

export interface HospitalizationRepository {
	getAllOpened(): Promise<Hospitalization[]>;
	open(patientId: ID): Promise<Hospitalization>;
	save(hospitalization: Hospitalization): Promise<void>;
	last(): Promise<Hospitalization>;
}
