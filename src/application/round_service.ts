import { MeasurementService } from "domain/hospitalization/parameters/measurement_service.ts";
import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { RoundBuilder } from "domain/hospitalization/rounds/round_builder.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";
import { PatientAlreadyDischarged } from "domain/patient/patient_already_discharged_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { RoundError } from "shared/errors.ts";
import { ID } from "shared/id.ts";

export class RoundService {
	#roundRepository: RoundRepository;
	#patientRepository: PatientRepository;
	#measurementService: MeasurementService;

	constructor(
		roundRepository: RoundRepository,
		patientRepository: PatientRepository,
		measurementService: MeasurementService,
	) {
		this.#roundRepository = roundRepository;
		this.#patientRepository = patientRepository;
		this.#measurementService = measurementService;
	}

	/**
	 * Registra medições de um paciente
	 * @param patientId
	 * @param userId
	 * @param data
	 * @returns {Promise<Either<Error, void>>}
	 */
	async new(
		patientId: string,
		data: ParametersData,
	): Promise<Either<RoundError, void>> {
		const patientOrErr = await this.#patientRepository.getById(
			ID.fromString(patientId),
		);
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		if (patientOrErr.value.hasBeenDischarged()) {
			return left(new PatientAlreadyDischarged(patientOrErr.value.name));
		}

		const patient = patientOrErr.value;
		const roundBuilderOrErr = new RoundBuilder(patient.systemId)
			.withHeartRate(data.heartRate)
			.withRespiratoryRate(data.respiratoryRate)
			.withTrc(data.trc)
			.withAvdn(data.avdn)
			.withMucosas(data.mucosas)
			.withTemperature(data.temperature)
			.withBloodGlucose(data.bloodGlucose)
			.withHct(data.hct)
			.withBloodPressure(data.bloodPressure)
			.build();

		if (roundBuilderOrErr.isLeft()) return left(roundBuilderOrErr.value);
		const round = roundBuilderOrErr.value;

		await this.#roundRepository.save(round);

		return right(undefined);
	}

	/**
	 * Recupera as últimas medições de um paciente
	 * @param patientId
	 * @returns {Promise<Either<PatientNotFound, Parameter[]>>}
	 */
	async latestMeasurements(id: string): Promise<Either<PatientNotFound, Parameter[]>> {
		const patientId = this.#buildPatientId(id);

		const patientOrErr = await this.#patientRepository.getById(patientId);
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const measurements = await this.#measurementService.latest(id);
		return right(measurements);
	}

	/**
	 * Recupera todas as medições de um paciente
	 * @param patientId
	 * @returns {Promise<Either<PatientNotFound, Parameter[]>>}
	 */
	async measurements(id: string): Promise<Either<PatientNotFound, Parameter[]>> {
		const patientId = this.#buildPatientId(id);

		const patientOrErr = await this.#patientRepository.getById(patientId);
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const measurements = await this.#measurementService.findAll(id);
		return right(measurements);
	}

	#buildPatientId(patientId: string): ID {
		return ID.fromString(patientId);
	}
}

export type MeasurementData = {
	value: unknown;
};

type ParametersData = {
	[key: string]: MeasurementData;
};
