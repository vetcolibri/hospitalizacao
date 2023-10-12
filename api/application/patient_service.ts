import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { Hospitalization, Patient } from "../domain/patients/patient.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
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
	 * @returns {Promise<Either<PatientNotFound, void>>}
	 */
	async newHospitalization(
		patientId: string,
		entryDate: string,
	): Promise<Either<PatientNotFound, void>> {
		const patientOrErr = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrErr.isLeft()) {
			return left(patientOrErr.value);
		}
		const patient = patientOrErr.value;
		const hospitalization = new Hospitalization(entryDate);
		patient.hospitalize(hospitalization);
		await this.patientRepository.update(patient);
		return right(undefined);
	}
}
