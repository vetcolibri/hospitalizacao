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
    notifier: AlertNotifier
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
    alertData: AlertData
  ): Promise<Either<Error, void>> {
    const patientOrError = await this.#patientRepository.getById(
      ID.New(patientId)
    );
    if (patientOrError.isLeft()) return left(patientOrError.value);

    const patient = patientOrError.value;

    const alertOrError = Alert.create(patient, alertData);
    if (alertOrError.isLeft()) return left(alertOrError.value);

    const alert = alertOrError.value;
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
    const alertOrError = await this.#alertRepository.getById(ID.New(alertId));
    if (alertOrError.isLeft()) return left(alertOrError.value);

    const alert = alertOrError.value;
    if (alert.isDisabled()) {
      return left(new Error("Alert is already disabled"));
    }

    alert.cancel();

    await this.#alertRepository.update(alert);

    this.#notifier.cancel(alert);

    return Promise.resolve(right(undefined));
  }
}
