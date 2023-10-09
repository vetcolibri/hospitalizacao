import { Patient } from "../patients/patient.ts";
import { Alert } from "./alert.ts";

export interface AlertRepository {
	verify(patient: Patient): Promise<boolean>;
	save(alert: Alert): Promise<void>;
}
