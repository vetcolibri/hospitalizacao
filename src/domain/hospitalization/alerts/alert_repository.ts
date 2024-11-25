import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { AlertNotFound } from "domain/hospitalization/alerts/alert_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface AlertRepository {
	findById(alertId: ID): Promise<Either<AlertNotFound, Alert>>;
	findByPatientId(patientId: ID): Promise<Alert[]>;
	findActivesByPatientId(patientId: ID): Promise<Alert[]>;
	findActives(): Promise<Alert[]>;
	save(alert: Alert): Promise<void>;
	last(): Promise<Alert>;
	update(alert: Alert): Promise<void>;
	updateAll(alerts: Alert[]): Promise<void>;
}
