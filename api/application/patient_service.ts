import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { DateInvalid } from "../domain/patients/date_invalid_error.ts";
import { Patient, PatientStatus } from "../domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "../domain/patients/patient_already_hospitalized_error.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";

export class PatientService {
	readonly patientRepository: PatientRepository;
	readonly alertRepository: AlertRepository;

	constructor(patientRepository: PatientRepository, alertRepository: AlertRepository) {
		this.patientRepository = patientRepository;
		this.alertRepository = alertRepository;
	}

	/**
	 * Lista os pacientes hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async hospitalizadPatients(): Promise<Patient[]> {
		const patients = await this.patientRepository.hospitalized();
		for (const patient of patients) {
			const hasAlert = await this.alertRepository.verify(patient);
			patient.changeAlertStatus(hasAlert);
		}
		return patients;
	}

	/**
	 * Cria uma nova hospitalização
	 * @param patientId
	 * @returns {Promise<Either<Error, void>>}
	 */
	async newHospitalization(
		patientId: string,
		entryDate: string,
		dischargeDate: string,
		estimatedBudgetDate: string,
	): Promise<Either<Error, void>> {
		const patientOrErr = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrErr.isLeft()) {
			return left(patientOrErr.value);
		}
		const patient = patientOrErr.value;
		if (patient.getStatus() === PatientStatus.HOSPITALIZED) {
			return left(new PatientAlreadyHospitalized());
		}

		const now = new Date();
		const recivedDate = new Date(entryDate);
		const discharge = new Date(dischargeDate);
		const budgetDate = new Date(estimatedBudgetDate);

		if (recivedDate < now) {
			return left(new DateInvalid("Data de entrada não pode ser menor que a data atual."));
		}
		if (discharge < now) {
			return left(new DateInvalid("Data de alta não pode ser menor que a data atual."));
		}
		if (budgetDate < now) {
			return left(
				new DateInvalid(
					"Data de previsão do orçamento não pode ser menor que a data atual.",
				),
			);
		}

		patient.hospitalize(entryDate, dischargeDate, estimatedBudgetDate);
		await this.patientRepository.update(patient);
		return right(undefined);
	}
}
