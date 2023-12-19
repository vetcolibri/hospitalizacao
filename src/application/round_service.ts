import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { RoundRepository } from "domain/rounds/round_repository.ts";
import { RoundBuilder } from "domain/rounds/round_builder.ts";
import { Parameter } from "domain/parameters/parameter.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

interface Dependencies {
  roundRepository: RoundRepository;
  patientRepository: PatientRepository;
}

export type MeasurementData = {
  value: unknown;
};

type ParametersData = {
  [key: string]: MeasurementData;
};

export class RoundService {
  private readonly deps: Dependencies;

  constructor(deps: Dependencies) {
    this.deps = deps;
  }

  /**
   * Registra medições de um paciente
   * @param patientId
   * @param userId
   * @param parameters
   * @returns {Promise<Either<Error, void>>}
   */
  async new(
    patientId: string,
    parameters: ParametersData
  ): Promise<Either<Error, void>> {
    const patientOrError = await this.deps.patientRepository.getById(
      ID.New(patientId)
    );
    if (patientOrError.isLeft()) return left(patientOrError.value);

    const patient = patientOrError.value;
    const {
      heartRate,
      respiratoryRate,
      trc,
      avdn,
      mucosas,
      temperature,
      bloodGlucose,
      hct,
      bloodPressure,
    } = parameters;
    const roundBuilder = new RoundBuilder(patient)
      .withHeartRate(heartRate)
      .withRespiratoryRate(respiratoryRate)
      .withTrc(trc)
      .withAvdn(avdn)
      .withMucosas(mucosas)
      .withTemperature(temperature)
      .withBloodGlucose(bloodGlucose)
      .withHct(hct)
      .withBloodPressure(bloodPressure)
      .build();

    if (roundBuilder.isLeft()) return left(roundBuilder.value);

    const round = roundBuilder.value;

    await this.deps.roundRepository.save(round);

    return right(undefined);
  }

  /**
   * Recupera as últimas medições de um paciente
   * @param patientId
   * @returns {Promise<Either<PatientNotFound, Parameter[]>>}
   */
  async latestMeasurements(
    patientId: string
  ): Promise<Either<PatientNotFound, Parameter[]>> {
    const patientOrError = await this.deps.patientRepository.getById(
      ID.New(patientId)
    );
    if (patientOrError.isLeft()) return left(patientOrError.value);

    const measurements = await this.deps.roundRepository.latestMeasurements(
      ID.New(patientId)
    );
    return right(measurements);
  }

  /**
   * Recupera todas as medições de um paciente
   * @param patientId
   * @returns {Promise<Either<PatientNotFound, Parameter[]>>}
   */
  async measurements(
    patientId: string
  ): Promise<Either<PatientNotFound, Parameter[]>> {
    const patientOrError = await this.deps.patientRepository.getById(
      ID.New(patientId)
    );
    if (patientOrError.isLeft()) return left(patientOrError.value);

    const measurements = await this.deps.roundRepository.measurements(
      ID.New(patientId)
    );
    return right(measurements);
  }
}
