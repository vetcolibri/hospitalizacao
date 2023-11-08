import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { Owner } from "../domain/patients/owner.ts";
import { Patient, PatientStatus } from "../domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "../domain/patients/patient_already_hospitalized_error.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";
import { HospitalizationData } from "../shared/types.ts";

interface Dependencies {
	alertRepository: AlertRepository;
	patientRepository: PatientRepository;
}

type PatientData = {
	readonly patientId: string;
	readonly name: string;
	readonly specie: string;
	readonly breed: string;
	readonly ownerId: string;
	readonly ownerName: string;
	readonly phoneNumber: string;
};

type NewPatientData = {
	readonly patientData: PatientData;
	readonly hospitalizationData: HospitalizationData;
};

export class PatientService {
	private readonly deps: Dependencies;

	constructor(deps: Dependencies) {
		this.deps = deps;
	}

	/**
	 * Lista os pacientes hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async hospitalizadPatients(): Promise<Patient[]> {
		const patients = await this.deps.patientRepository.hospitalized();
		for (const patient of patients) {
			const hasAlert = await this.deps.alertRepository.verify(patient);
			patient.changeAlertStatus(hasAlert);
		}
		return patients;
	}

	/**
	 * Cria uma nova hospitalização
	 * @param patientId
	 * @param hospitalizationData
	 * @returns {Promise<Either<Error, void>>}
	 */
	async newHospitalization(
		patientId: string,
		hospitalizationData: HospitalizationData,
	): Promise<Either<Error, void>> {
		const patientOrError = await this.deps.patientRepository.getById(ID.New(patientId));
		if (patientOrError.isLeft()) return left(patientOrError.value);

		const patient = patientOrError.value;
		if (patient.getStatus() === PatientStatus.HOSPITALIZED) {
			return left(new PatientAlreadyHospitalized(patient.name));
		}

		const voidOrError = patient.hospitalize(hospitalizationData);
		if (voidOrError.isLeft()) return left(voidOrError.value);

		await this.deps.patientRepository.update(patient);
		return right(undefined);
	}

	/**
	 * Lista os pacientes não hospitalizados
	 * @returns {Promise<Either<Error, Patient[]>>}
	 */
	async nonHospitalized(): Promise<Either<Error, Patient[]>> {
		const patients = await this.deps.patientRepository.nonHospitalized();
		return right(patients);
	}

	/**
	 * Cria um novo paciente
	 * @param newPatientData
	 * @returns {Promise<Either<Error, void>>}
	 */
	async newPatient(newPatientData: NewPatientData): Promise<Either<Error, void>> {
		const { patientData, hospitalizationData } = newPatientData;
		const {
			patientId,
			name,
			breed,
			specie,
			ownerName,
			ownerId,
			phoneNumber,
		} = patientData;

		const owner = new Owner(ownerId, ownerName, phoneNumber);
		const patient = new Patient(patientId, name, breed, owner, specie);

		const voidOrError = patient.hospitalize(hospitalizationData);
		if (voidOrError.isLeft()) return left(voidOrError.value);

		await this.deps.patientRepository.save(patient);

		return right(undefined);
	}
}
