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
import { ParametersData } from "../shared/types.ts";

export class RoundService {
	readonly roundRepository: RoundRepository;
	readonly patientRepository: PatientRepository;
	readonly userRepository: UserRepository;

	constructor(
		roundRepository: RoundRepository,
		patientRepository: PatientRepository,
		userRepository: UserRepository,
	) {
		this.roundRepository = roundRepository;
		this.patientRepository = patientRepository;
		this.userRepository = userRepository;
	}

	async new(
		patientId: string,
		userId: string,
		date: string,
		parameters: ParametersData,
	): Promise<Either<PatientNotFound, void>> {
		const patientOrError = await this.patientRepository.getById(ID.New(patientId));
		if (patientOrError.isLeft()) {
			return left(patientOrError.value);
		}

		const user = await this.userRepository.get(ID.New(userId));
		const patient = patientOrError.value;

		const round = new Round(patient);

		if (parameters.heartRate) {
			const heartRate = new HeartRate(Number(parameters.heartRate.value), date, user);
			round.addParameter(heartRate);
		}

		if (parameters.respiratoryRate) {
			const respiratoryRate = new RespiratoryRate(
				Number(parameters.respiratoryRate.value),
				date,
				user,
			);
			round.addParameter(respiratoryRate);
		}

		if (parameters.trc) {
			const trc = new Trc(Number(parameters.trc.value), date, user);
			round.addParameter(trc);
		}

		if (parameters.avdn) {
			const avdn = new Avdn(String(parameters.avdn.value), date, user);
			round.addParameter(avdn);
		}

		if (parameters.mucosas) {
			const mucosas = new Mucosas(String(parameters.mucosas.value), date, user);
			round.addParameter(mucosas);
		}

		if (parameters.temperature) {
			const temperature = new Temperature(Number(parameters.temperature.value), date, user);
			round.addParameter(temperature);
		}

		if (parameters.bloodGlucose) {
			const bloodGlucose = new BloodGlucose(
				Number(parameters.bloodGlucose.value),
				date,
				user,
			);
			round.addParameter(bloodGlucose);
		}

		if (parameters.hct) {
			const hct = new Hct(Number(parameters.hct.value), date, user);
			round.addParameter(hct);
		}

		if (parameters.bloodPressure) {
			const bloodPressure = new BloodPressure(
				String(parameters.bloodPressure.value),
				date,
				user,
			);
			round.addParameter(bloodPressure);
		}

		await this.roundRepository.save(round);

		return right(undefined);
	}
}
