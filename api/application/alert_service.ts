import { Alert } from "../domain/alerts/alert.ts";
import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";

export class AlertService {
	readonly alertRepository: AlertRepository;
	readonly patientRepository: PatientRepository;

	constructor(alertRepository: AlertRepository, patientRepository: PatientRepository) {
		this.alertRepository = alertRepository;
		this.patientRepository = patientRepository;
	}

	async schedule(
		patientId: string,
		parameters: string[],
	): Promise<Either<PatientNotFound, void>> {
		const patientOrErr = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;
		const alert = new Alert(patient);
		alert.setParameters(parameters);

		await this.alertRepository.save(alert);

		return right(undefined);
	}
}
