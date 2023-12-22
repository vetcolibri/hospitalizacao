import { AlertRepository } from "domain/alerts/alert_repository.ts";
import { ID } from "shared/id.ts";
import { IDAlreadyExists } from "domain/patients/id_already_exists_error.ts";
import { Owner } from "domain/patients/owner.ts";
import { OwnerNotFound } from "domain/patients/owner_not_found_error.ts";
import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "domain/patients/patient_already_hospitalized_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { HospitalizationData, NewPatientData } from "shared/types.ts";

export class PatientService {
  readonly #alertRepository: AlertRepository;
  readonly #patientRepository: PatientRepository;

  constructor(
    partientRepository: PatientRepository,
    alertRepository: AlertRepository
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
    hospitalizationData: HospitalizationData
  ): Promise<Either<Error, void>> {
    const patientOrError = await this.#patientRepository.getById(
      ID.New(patientId)
    );
    if (patientOrError.isLeft()) return left(patientOrError.value);

    const patient = patientOrError.value;
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
   * @returns {Promise<Either<Error, Patient[]>>}
   */
  async nonHospitalized(): Promise<Either<Error, Patient[]>> {
    const patients = await this.#patientRepository.nonHospitalized();
    return right(patients);
  }

  /**
   * Cria um novo paciente
   * @param newPatientData
   * @returns {Promise<Either<Error, void>>}
   */
  async newPatient(
    newPatientData: NewPatientData
  ): Promise<Either<Error, void>> {
    const { patientData, hospitalizationData, ownerData } = newPatientData;
    const { patientId } = patientData;

    const patientExists = await this.#patientRepository.exists(
      ID.New(patientId)
    );
    if (patientExists) return left(new IDAlreadyExists());

    const owner = Owner.create(ownerData);
    const patient = Patient.create(patientData, owner);
    const voidOrError = patient.hospitalize(hospitalizationData);
    if (voidOrError.isLeft()) return left(voidOrError.value);

    await this.#patientRepository.save(patient);

    return right(undefined);
  }

  async findOwner(ownerId: string): Promise<Either<OwnerNotFound, Owner>> {
    const ownerOrError = await this.#patientRepository.findOwner(
      ID.New(ownerId)
    );
    if (ownerOrError.isLeft()) return left(ownerOrError.value);

    const owner = ownerOrError.value;

    return right(owner);
  }
}
