import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { AlertNotFound } from "domain/hospitalization/alerts/alert_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface AlertRepository {
	getActives(): Promise<Alert[]>;
	findAll(patientId: ID): Promise<Alert[]>;
	findActives(patientId: ID): Promise<Alert[]>;
	verify(patientId: ID): Promise<boolean>;
	save(alert: Alert): Promise<void>;
	last(): Promise<Alert>;
	active(AlertId: ID): Promise<Either<AlertNotFound, Alert>>;
	update(alert: Alert): Promise<void>;
	updateAll(alerts: Alert[]): Promise<void>;
}
