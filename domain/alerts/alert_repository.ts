import { Either } from "../../shared/either.ts";
import { ID } from "../id.ts";
import { Patient } from "../patients/patient.ts";
import { Alert } from "./alert.ts";
import { AlertNotFound } from "./alert_not_found_error.ts";

export interface AlertRepository {
	findAll(patientId: ID): Promise<Alert[]>;
	verify(patient: Patient): Promise<boolean>;
	save(alert: Alert): Promise<void>;
	last(): Promise<Alert>;
	getById(AlertId: ID): Promise<Either<AlertNotFound, Alert>>;
	update(alert: Alert): Promise<void>;
}
