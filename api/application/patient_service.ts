import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { IdRepository } from "../domain/id_generator.ts";
import { DateInvalid } from "../domain/patients/date_invalid_error.ts";
import { Owner } from "../domain/patients/owner.ts";
import { Patient, PatientStatus } from "../domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "../domain/patients/patient_already_hospitalized_error.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";
import { ERROR_MESSAGES } from "../shared/error_messages.ts";
import { HospitalizationData, NewPatientData } from "../shared/types.ts";

export class PatientService {
	readonly patientRepository: PatientRepository;
	readonly alertRepository: AlertRepository;
	readonly idRepository: IdRepository;

	constructor(
		patientRepository: PatientRepository,
		alertRepository: AlertRepository,
		idRepository: IdRepository,
	) {
		this.patientRepository = patientRepository;
		this.alertRepository = alertRepository;
		this.idRepository = idRepository;
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
		hospitalizationData: HospitalizationData,
	): Promise<Either<Error, void>> {
		const patientOrErr = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrErr.isLeft()) {
			return left(patientOrErr.value);
		}

		const patient = patientOrErr.value;
		if (patient.getStatus() === PatientStatus.HOSPITALIZED) {
			return left(new PatientAlreadyHospitalized(patient.name));
		}

		const {
			entryDate,
			dischargeDate,
			estimatedBudgetDate,
		} = hospitalizationData;

		const date = new Date();
		const today = new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
		const recivedDate = new Date(entryDate);
		if (recivedDate.getDate() < today.getDate()) {
			return left(new DateInvalid(ERROR_MESSAGES.ENTRY_DATE_INVALID));
		}
		const discharge = new Date(dischargeDate);
		if (discharge.getDate() < today.getDate()) {
			return left(new DateInvalid(ERROR_MESSAGES.DISCHARGE_DATE_INVALID));
		}
		const budgetDate = new Date(estimatedBudgetDate);
		if (budgetDate.getDate() < today.getDate()) {
			return left(new DateInvalid(ERROR_MESSAGES.ESTIMATED_BUDGET_DATE_INVALID));
		}

		patient.hospitalize(hospitalizationData);
		await this.patientRepository.update(patient);
		return right(undefined);
	}

	/**
	 * Recupera um paciente pelo id
	 * @param patientId
	 * @returns {Promise<Either<Error, Patient>>}
	 */
	async findPatient(patientId: string): Promise<Either<Error, Patient>> {
		const patientOrErr = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrErr.isLeft()) {
			return left(patientOrErr.value);
		}
		return right(patientOrErr.value);
	}

	/**
	 * Recupera um paciente pelo id
	 * @param newPatientData
	 * @returns {Promise<Either<Error, void>>}
	 */
	async newPatient(newPatientData: NewPatientData): Promise<Either<Error, void>> {
		const { patientData, hospitalizationData } = newPatientData;
		const {
			name,
			breed,
			specie,
			ownerName,
			ownerId,
			phoneNumber,
		} = patientData;

		const newId = await this.idRepository.generate(name, ownerName);
		const owner = new Owner(ownerId, ownerName, phoneNumber);
		const patient = new Patient(newId, name, breed, owner, specie);
		patient.hospitalize(hospitalizationData);
		await this.patientRepository.save(patient);

		return Promise.resolve(right(undefined));
	}
}
