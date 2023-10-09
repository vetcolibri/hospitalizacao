import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { Patient } from "../domain/patients/patient.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";

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
}
