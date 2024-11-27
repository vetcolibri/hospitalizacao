import { AlertNotifier, AlertPayload } from "application/alert_notifier.ts";
import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { AlertAlreadyCanceled } from "domain/hospitalization/alerts/alert_already_canceled_error.ts";
import { AlertBuider } from "domain/hospitalization/alerts/alert_buider.ts";
import { AlertRepository } from "domain/hospitalization/alerts/alert_repository.ts";
import { Patient } from "domain/patient/patient.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { CancelError, ScheduleError } from "shared/errors.ts";
import { ID } from "shared/id.ts";
import { UserRepository } from "domain/auth/user_repository.ts";
import { Username } from "domain/auth/username.ts";
import { User } from "domain/auth/user.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

export class AlertService {
	#alertRepository: AlertRepository;
	#patientRepository: PatientRepository;
	#userRepository: UserRepository;
	#notifier: AlertNotifier;

	constructor(
		alertRepository: AlertRepository,
		patientRepository: PatientRepository,
		userRepository: UserRepository,
		notifier: AlertNotifier,
	) {
		this.#alertRepository = alertRepository;
		this.#patientRepository = patientRepository;
		this.#userRepository = userRepository;
		this.#notifier = notifier;
	}

	/**
	 * Agenda um alerta
	 * @param alertData
	 * @returns {Promise<Either<ScheduleError, void>>}
	 */
	async schedule(data: AlertData): Promise<Either<ScheduleError, void>> {
	    const hasPerm = await this.#checkPermission(data.username)
		if (!hasPerm) {
			return left(new PermissionDenied("O nível de Utilizador não lhe permite agendar alertas."));
		}

		const patientOrErr = await this.#patientRepository.findBySystemId(
			ID.fromString(data.patientId),
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
	async cancel(alertId: string, username: string): Promise<Either<CancelError, void>> {
	    const hasPerm = await this.#checkPermission(username)
		if (!hasPerm) {
		    return left(new PermissionDenied("O nível de Utilizador não lhe permite cancelar alertas."))
		}

		const alertOrErr = await this.#alertRepository.findById(ID.fromString(alertId));
		if (alertOrErr.isLeft()) return left(alertOrErr.value);

		const alert = alertOrErr.value;
		if (alert.isCanceled()) return left(new AlertAlreadyCanceled());

		alert.cancel();

		await this.#alertRepository.update(alert);

		this.#notifier.cancel(alertId);

		return right(undefined);
	}

	/**
	 * Lista todos os alertas activos
	 * @returns {Promise<Alert[]>}
	 */
	async findActiveAlerts(): Promise<Alert[]> {
		return await this.#alertRepository.findActives();
	}

	async #checkPermission(username: string): Promise<boolean> {
		const userOrErr = await this.#userRepository.getByUsername(Username.fromString(username));
		const user = <User> userOrErr.value;
		return user.hasAlertWritePermission();
	}

	#buildAlertPayload(alert: Alert, patient: Patient): AlertPayload {
		return {
			alertId: alert.alertId.value,
			patient: {
				patientId: patient.systemId.value,
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
	patientId: string;
	parameters: string[];
	rate: number;
	comments: string;
	username: string;
	time: string;
};
