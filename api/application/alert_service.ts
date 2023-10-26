import { Alert } from "../domain/alerts/alert.ts";
import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";

export interface Manager {
	registerCron(alert: Alert): void;
	removeCron(alertId: ID): void;
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
	): Promise<Either<PatientNotFound, void>> {
		const patientOrErr = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;
		const alert = Alert.create(patient, parameters);
		await this.alertRepository.save(alert);

		this.taskManager.registerCron(alert);

		return right(undefined);
	}

	async cancel(alertId: string): Promise<void> {
		const alert = await this.alertRepository.getById(ID.New(alertId));

		alert.cancel();

		await this.alertRepository.update(alert);

		this.taskManager.removeCron(alert.alertId);
	}
}
