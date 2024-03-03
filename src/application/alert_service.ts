import { Alert } from "domain/alerts/alert.ts";

import { ID } from "shared/id.ts";

import { Either, left, right } from "shared/either.ts";
import { AlertData } from "shared/types.ts";
import { AlertNotifier } from "./alert_notifier.ts";
import { AlertRepository } from "domain/alerts/alert_repository.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";

export class AlertService {
	readonly #alertRepository: AlertRepository;
	readonly #patientRepository: PatientRepository;
	readonly #notifier: AlertNotifier;

	constructor(
		alertRepository: AlertRepository,
		patientRepository: PatientRepository,
		notifier: AlertNotifier,
	) {
		this.#alertRepository = alertRepository;
		this.#patientRepository = patientRepository;
		this.#notifier = notifier;
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
		const patientOrErr = await this.#patientRepository.getById(
			ID.fromString(patientId),
		);
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;

		const alertOrErr = Alert.create(patient, alertData);
		if (alertOrErr.isLeft()) return left(alertOrErr.value);

		const alert = alertOrErr.value;

		await this.#alertRepository.save(alert);

		this.#notifier.schedule(alert);

		return right(undefined);
	}

	/**
	 * Cancela um alerta
	 * @param alertId
	 * @returns {Promise<Either<Error, void>>}
	 */
	async cancel(alertId: string): Promise<Either<Error, void>> {
		const alertOrErr = await this.#alertRepository.getById(ID.fromString(alertId));
		if (alertOrErr.isLeft()) return left(alertOrErr.value);

		const alert = alertOrErr.value;
		if (alert.isDisabled()) return left(new Error("Alert is already disabled"));

		alert.cancel();

		await this.#alertRepository.update(alert);

		this.#notifier.cancel(alert);

		return right(undefined);
	}
}
