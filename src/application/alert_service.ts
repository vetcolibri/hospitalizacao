import { AlertAlreadyDisabled } from "domain/alerts/alert_already_disabled_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { AlertRepository } from "domain/alerts/alert_repository.ts";
import { AlertNotifier, AlertPayload } from "./alert_notifier.ts";
import { CancelError, ScheduleError } from "shared/errors.ts";
import { AlertBuider } from "../domain/alerts/alert_buider.ts";
import { Either, left, right } from "shared/either.ts";
import { Patient } from "domain/patients/patient.ts";
import { Alert } from "domain/alerts/alert.ts";
import { ID } from "shared/id.ts";

export class AlertService {
	#alertRepository: AlertRepository;
	#patientRepository: PatientRepository;
	#notifier: AlertNotifier;

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
	 * Agenda um alerta
	 * @param patientId
	 * @param data
	 * @returns {Promise<Either<ScheduleError, void>>}
	 */
	async schedule(
		patientId: string,
		data: AlertData,
	): Promise<Either<ScheduleError, void>> {
		const patientOrErr = await this.#patientRepository.getById(
			ID.fromString(patientId),
		);
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;

		const alertBuilderOrErr = new AlertBuider()
			.withPatientId(patient.systemId)
			.withParameters(data.parameters)
			.withReapetEvery(data.rate)
			.withTime(data.time)
			.withComments(data.comments)
			.build();

		if (alertBuilderOrErr.isLeft()) return left(alertBuilderOrErr.value);

		const alert = alertBuilderOrErr.value;

		await this.#alertRepository.save(alert);

		const payload = this.#buildAlertPayload(alert, patient);

		this.#notifier.schedule(payload);

		return right(undefined);
	}

	/**
	 * Cancela um alerta
	 * @param alertId
	 * @returns {Promise<Either<CancelError, void>>}
	 */
	async cancel(alertId: string): Promise<Either<CancelError, void>> {
		const alertOrErr = await this.#alertRepository.active(ID.fromString(alertId));
		if (alertOrErr.isLeft()) return left(alertOrErr.value);

		const alert = alertOrErr.value;
		if (alert.isDisabled()) return left(new AlertAlreadyDisabled());

		alert.cancel();

		await this.#alertRepository.update(alert);

		this.#notifier.cancel(alertId);

		return right(undefined);
	}

	/**
	 * Lista todos os alertas activos
	 * @returns {Promise<Alert[]>}
	 */
	async getActiveAlerts(): Promise<Alert[]> {
		return await this.#alertRepository.getActiveAlerts();
	}

	#buildAlertPayload(alert: Alert, patient: Patient): AlertPayload {
		return {
			alertId: alert.alertId.value,
			patient: {
				patientId: patient.patientId.value,
				name: patient.name,
			},
			comments: alert.comments,
			time: new Date(alert.time),
			rate: alert.repeatEvery,
			parameters: alert.parameters,
		};
	}
}

type AlertData = {
	parameters: string[];
	rate: number;
	comments: string;
	time: string;
};
