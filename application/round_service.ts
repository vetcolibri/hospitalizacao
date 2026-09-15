import { MeasurementService } from "domain/hospitalization/parameters/measurement_service.ts";
import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { MultipleOpenHospitalizations } from "domain/hospitalization/multiple_open_hospitalizations_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { RoundBuilder } from "domain/hospitalization/rounds/round_builder.ts";
import { RoundRepository } from "domain/hospitalization/rounds/round_repository.ts";
import { PatientAlreadyDischarged } from "domain/patient/patient_already_discharged_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { RoundError } from "shared/errors.ts";
import { ID } from "shared/id.ts";
import { UserRepository } from "domain/auth/user_repository.ts";
import { Username } from "domain/auth/username.ts";
import { User } from "domain/auth/user.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

export class RoundService {
	#roundRepository: RoundRepository;
	#patientRepository: PatientRepository;
	#hospitalizationRepository: HospitalizationRepository;
	#userRepository: UserRepository;
	#measurementService: MeasurementService;

	constructor(
		roundRepository: RoundRepository,
		patientRepository: PatientRepository,
		hospitalizationRepository: HospitalizationRepository,
		userRepository: UserRepository,
		measurementService: MeasurementService,
	) {
		this.#roundRepository = roundRepository;
		this.#patientRepository = patientRepository;
		this.#hospitalizationRepository = hospitalizationRepository;
		this.#userRepository = userRepository;
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
		username: string,
	): Promise<Either<RoundError, void>> {
		const userOrErr = await this.#userRepository.getByUsername(Username.fromString(username));
		const user = <User> userOrErr.value;
		if (!user.hasRoundWritePermission()) {
			return left(
				new PermissionDenied(
					"O nível de Utilizador não lhe permite efectuar Rondas.",
				),
			);
		}

		const patientOrErr = await this.#patientRepository.findBySystemId(
			ID.fromString(patientId),
		);
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		if (patientOrErr.value.hasBeenDischarged()) {
			return left(new PatientAlreadyDischarged(patientOrErr.value.name));
		}

		const patient = patientOrErr.value;
		const openHospitalizations = await this.#hospitalizationRepository.findOpenByPatientId(
			patient.systemId,
		);

		if (openHospitalizations.length !== 1) {
			return left(
				openHospitalizations.length === 0
					? new HospitalizationNotFound()
					: new MultipleOpenHospitalizations(),
			);
		}

		const hospitalization = openHospitalizations[0];

		const roundBuilderOrErr = new RoundBuilder(
			patient.systemId,
			hospitalization.hospitalizationId,
		)
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

		const patientOrErr = await this.#patientRepository.findBySystemId(patientId);
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

		const patientOrErr = await this.#patientRepository.findBySystemId(patientId);
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
