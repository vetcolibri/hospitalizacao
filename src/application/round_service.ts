import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { RoundRepository } from "domain/rounds/round_repository.ts";
import { RoundBuilder } from "domain/rounds/round_builder.ts";
import { Parameter } from "domain/parameters/parameter.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

export type MeasurementData = {
	value: unknown;
};

type ParametersData = {
	[key: string]: MeasurementData;
};

export class RoundService {
	readonly #roundRepository: RoundRepository;
	readonly #patientRepository: PatientRepository;

	constructor(
		roundRepository: RoundRepository,
		patientRepository: PatientRepository,
	) {
		this.#roundRepository = roundRepository;
		this.#patientRepository = patientRepository;
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
		parameters: ParametersData,
	): Promise<Either<Error, void>> {
		const patientOrError = await this.#patientRepository.getById(
			ID.fromString(patientId),
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

		await this.#roundRepository.save(round);

		return right(undefined);
	}

	/**
	 * Recupera as últimas medições de um paciente
	 * @param patientId
	 * @returns {Promise<Either<PatientNotFound, Parameter[]>>}
	 */
	async latestMeasurements(
		patientId: string,
	): Promise<Either<PatientNotFound, Parameter[]>> {
		const patientOrError = await this.#patientRepository.getById(
			ID.fromString(patientId),
		);
		if (patientOrError.isLeft()) return left(patientOrError.value);

		const measurements = await this.#roundRepository.latestMeasurements(
			ID.fromString(patientId),
		);
		return right(measurements);
	}

	/**
	 * Recupera todas as medições de um paciente
	 * @param patientId
	 * @returns {Promise<Either<PatientNotFound, Parameter[]>>}
	 */
	async measurements(
		patientId: string,
	): Promise<Either<PatientNotFound, Parameter[]>> {
		const patientOrError = await this.#patientRepository.getById(
			ID.fromString(patientId),
		);
		if (patientOrError.isLeft()) return left(patientOrError.value);

		const measurements = await this.#roundRepository.measurements(
			ID.fromString(patientId),
		);
		return right(measurements);
	}
}
