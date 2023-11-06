import { RoundRepository } from "../domain/rounds/round_repository.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { UserRepository } from "../domain/users/user_repository.ts";
import { Round } from "../domain/rounds/round.ts";
import { HeartRate } from "../domain/parameters/heart_rate.ts";
import { ID } from "../domain/id.ts";
import { Either, left, right } from "../shared/either.ts";
import { PatientNotFound } from "../domain/patients/patient_not_found_error.ts";
import { RespiratoryRate } from "../domain/parameters/respiratore_rate.ts";
import { Trc } from "../domain/parameters/trc.ts";
import { Temperature } from "../domain/parameters/temperature.ts";
import { Avdn } from "../domain/parameters/avdn.ts";
import { Mucosas } from "../domain/parameters/mucosas.ts";
import { BloodGlucose } from "../domain/parameters/blood_glucose.ts";
import { Hct } from "../domain/parameters/hct.ts";
import { BloodPressure } from "../domain/parameters/blood_pressure.ts";
import { Parameter } from "../domain/parameters/parameter.ts";

interface Dependencies {
	roundRepository: RoundRepository;
	patientRepository: PatientRepository;
	userRepository: UserRepository;
}

type MeasurementData = {
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

	async new(
		patientId: string,
		userId: string,
		parameters: ParametersData,
	): Promise<Either<PatientNotFound, void>> {
		const patientOrError = await this.deps.patientRepository.getById(ID.New(patientId));
		if (patientOrError.isLeft()) {
			return left(patientOrError.value);
		}

		const user = await this.deps.userRepository.get(ID.New(userId));
		const patient = patientOrError.value;
		const round = new Round(patient);

		if (parameters.heartRate) {
			const heartRate = new HeartRate(Number(parameters.heartRate.value), user);
			round.addParameter(heartRate);
		}

		if (parameters.respiratoryRate) {
			const respiratoryRate = new RespiratoryRate(
				Number(parameters.respiratoryRate.value),
				user,
			);
			round.addParameter(respiratoryRate);
		}

		if (parameters.trc) {
			const trc = new Trc(Number(parameters.trc.value), user);
			round.addParameter(trc);
		}

		if (parameters.avdn) {
			const avdn = new Avdn(String(parameters.avdn.value), user);
			round.addParameter(avdn);
		}

		if (parameters.mucosas) {
			const mucosas = new Mucosas(String(parameters.mucosas.value), user);
			round.addParameter(mucosas);
		}

		if (parameters.temperature) {
			const temperature = new Temperature(Number(parameters.temperature.value), user);
			round.addParameter(temperature);
		}

		if (parameters.bloodGlucose) {
			const bloodGlucose = new BloodGlucose(
				Number(parameters.bloodGlucose.value),
				user,
			);
			round.addParameter(bloodGlucose);
		}

		if (parameters.hct) {
			const hct = new Hct(Number(parameters.hct.value), user);
			round.addParameter(hct);
		}

		if (parameters.bloodPressure) {
			const bloodPressure = new BloodPressure(
				String(parameters.bloodPressure.value),
				user,
			);
			round.addParameter(bloodPressure);
		}

		await this.deps.roundRepository.save(round);

		return right(undefined);
	}

	async latestMeasurements(patientId: string): Promise<Parameter[]> {
		return await this.deps.roundRepository.latestMeasurements(ID.New(patientId));
	}
}
