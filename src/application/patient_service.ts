import { PatientAlreadyHospitalized } from "domain/patients/patient_already_hospitalized_error.ts";
import { Patient, PatientBuilder, PatientStatus } from "domain/patients/patient.ts";
import { IDAlreadyExists } from "domain/patients/id_already_exists_error.ts";
import { OwnerNotFound } from "domain/patients/owner_not_found_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { HospitalizationData, NewPatientData } from "shared/types.ts";
import { AlertRepository } from "domain/alerts/alert_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { Owner } from "domain/patients/owner.ts";
import { ID } from "shared/id.ts";

export class PatientService {
	readonly #alertRepository: AlertRepository;
	readonly #patientRepository: PatientRepository;

	constructor(
		partientRepository: PatientRepository,
		alertRepository: AlertRepository,
	) {
		this.#patientRepository = partientRepository;
		this.#alertRepository = alertRepository;
	}

	/**
	 * Lista os pacientes hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async hospitalizadPatients(): Promise<Patient[]> {
		const patients = await this.#patientRepository.hospitalized();
		for (const patient of patients) {
			const hasAlert = await this.#alertRepository.verify(patient.patientId);
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
		const patientOrErr = await this.#patientRepository.getById(
			ID.fromString(patientId),
		);
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;
		if (patient.getStatus() === PatientStatus.HOSPITALIZED) {
			return left(new PatientAlreadyHospitalized(patient.name));
		}

		const voidOrError = patient.hospitalize(hospitalizationData);
		if (voidOrError.isLeft()) return left(voidOrError.value);

		await this.#patientRepository.update(patient);
		return right(undefined);
	}

	/**
	 * Lista os pacientes não hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async nonHospitalized(): Promise<Patient[]> {
		return await this.#patientRepository.nonHospitalized();
	}

	/**
	 * Cria um novo paciente
	 * @param newPatientData
	 * @returns {Promise<Either<Error, void>>}
	 */
	async newPatient(
		newPatientData: NewPatientData,
	): Promise<Either<Error, void>> {
		const { patientData, hospitalizationData, ownerData } = newPatientData;
		const { patientId } = patientData;

		const patientExists = await this.#patientRepository.exists(
			ID.fromString(patientId),
		);
		if (patientExists) return left(new IDAlreadyExists());

		const owner = new Owner(ownerData.ownerId, ownerData.name, ownerData.phoneNumber);

		const patient = new PatientBuilder()
			.withSystemId(ID.random())
			.withPatientId(ID.fromString(patientId))
			.withName(patientData.name)
			.withOwner(owner)
			.withSpecie(patientData.specie)
			.withBreed(patientData.breed)
			.withBirthDate(patientData.birthDate)
			.build();

		const voidOrErr = patient.hospitalize(hospitalizationData);
		if (voidOrErr.isLeft()) return left(voidOrErr.value);

		await this.#patientRepository.save(patient);

		return right(undefined);
	}

	async findOwner(ownerId: string): Promise<Either<OwnerNotFound, Owner>> {
		const ownerOrErr = await this.#patientRepository.findOwner(
			ID.fromString(ownerId),
		);
		if (ownerOrErr.isLeft()) return left(ownerOrErr.value);

		const owner = ownerOrErr.value;

		return right(owner);
	}
}
