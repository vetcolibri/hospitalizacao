import { AlertRepository } from "../domain/alerts/alert_repository.ts";
import { ID } from "../domain/id.ts";
import { IDAlreadyExists } from "../domain/patients/id_already_exists_error.ts";
import { Owner } from "../domain/patients/owner.ts";
import { Patient, PatientStatus } from "../domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "../domain/patients/patient_already_hospitalized_error.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { Either, left, right } from "../shared/either.ts";
import { HospitalizationData, OwnerData, PatientData } from "../shared/types.ts";

interface Dependencies {
	alertRepository: AlertRepository;
	patientRepository: PatientRepository;
}

type NewPatientData = {
	readonly patientData: PatientData;
	readonly hospitalizationData: HospitalizationData;
	readonly ownerData: OwnerData;
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
		const patientOrError = await this.deps.patientRepository.get(ID.New(patientId));
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
		const { patientData, hospitalizationData, ownerData } = newPatientData;
		const {
			patientId,
		} = patientData;

		const patientExists = await this.deps.patientRepository.exists(ID.New(patientId));
		if (patientExists) return left(new IDAlreadyExists());

		const owner = Owner.create(ownerData);
		const patient = Patient.create(patientData, owner);

		const voidOrError = patient.hospitalize(hospitalizationData);
		if (voidOrError.isLeft()) return left(voidOrError.value);

		await this.deps.patientRepository.save(patient);

		return right(undefined);
	}
}
