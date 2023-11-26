import { Alert } from "../domain/alerts/alert.ts";
import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";

export interface Manager {
	registerCron(alert: Alert): void;
	removeCron(alert: Alert): void;
}

interface Dependencies {
	alertRepository: AlertRepository;
	patientRepository: PatientRepository;
	taskManager: Manager;
}

type AlertData = {
	parameters: string[];
	rate: number;
	time: string;
	comments: string;
};

export class AlertService {
	private readonly deps: Dependencies;

	constructor(deps: Dependencies) {
		this.deps = deps;
	}

	/**
	 * Cria um novo alerta
	 * @param patientId
	 * @param alertData
	 * @returns {Promise<Either<Error, void>>}
	 */
	async schedule(
		patientId: string,
		alertData: AlertData,
	): Promise<Either<Error, void>> {
		const patientOrError = await this.deps.patientRepository.get(ID.New(patientId));
		if (patientOrError.isLeft()) return left(patientOrError.value);

		const patient = patientOrError.value;

		const alertOrError = Alert.create(patient, alertData);
		if (alertOrError.isLeft()) return left(alertOrError.value);

		const alert = alertOrError.value;
		await this.deps.alertRepository.save(alert);

		this.deps.taskManager.registerCron(alert);

		return right(undefined);
	}

	/**
	 * Cancela um alerta
	 * @param alertId
	 * @returns {Promise<Either<Error, void>>}
	 */
	async cancel(alertId: string): Promise<Either<Error, void>> {
		const alertOrError = await this.deps.alertRepository.getById(ID.New(alertId));
		if (alertOrError.isLeft()) return left(alertOrError.value);

		const alert = alertOrError.value;
		if (alert.isDisabled()) {
			return left(new Error("Alert is already disabled"));
		}

		alert.cancel();

		await this.deps.alertRepository.update(alert);

		this.deps.taskManager.removeCron(alert);

		return Promise.resolve(right(undefined));
	}
}
