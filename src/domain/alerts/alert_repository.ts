import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { Alert } from "./alert.ts";
import { AlertNotFound } from "./alert_not_found_error.ts";

export interface AlertRepository {
	getActiveAlerts(): Promise<Alert[]>;
	findAll(patientId: ID): Promise<Alert[]>;
	verify(patientId: ID): Promise<boolean>;
	save(alert: Alert): Promise<void>;
	last(): Promise<Alert>;
	active(AlertId: ID): Promise<Either<AlertNotFound, Alert>>;
	update(alert: Alert): Promise<void>;
}
