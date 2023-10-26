import { Alert, AlertStatus } from "../domain/alerts/alert.ts";
import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";

export interface Manager {
	registerCron(alert: Alert): void;
	removeCron(alert: Alert): void;
}

export class AlertService {
	readonly alertRepository: AlertRepository;
	readonly patientRepository: PatientRepository;
	readonly taskManager: Manager;

	constructor(
		alertRepository: AlertRepository,
		patientRepository: PatientRepository,
		taskManager: Manager,
	) {
		this.alertRepository = alertRepository;
		this.patientRepository = patientRepository;
		this.taskManager = taskManager;
	}

	async schedule(
		patientId: string,
		parameters: string[],
		rate: number,
		comments: string,
		time: string,
	): Promise<Either<PatientNotFound, void>> {
		const patientOrErr = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;
		const alert = Alert.create(patient, parameters, rate, comments, time);
		await this.alertRepository.save(alert);

		this.taskManager.registerCron(alert);

		return right(undefined);
	}

	async cancel(alertId: string): Promise<Either<Error, void>> {
		const alertOrErr = await this.alertRepository.getById(ID.New(alertId));
		if (alertOrErr.isLeft()) return left(alertOrErr.value);

		const alert = alertOrErr.value;
		if (alert.getStatus() === AlertStatus.DISABLED) {
			return left(new Error("Alert is already disabled"));
		}

		alert.cancel();

		await this.alertRepository.update(alert);

		this.taskManager.removeCron(alert);

		return Promise.resolve(right(undefined));
	}
}
