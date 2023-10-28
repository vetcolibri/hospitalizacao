import { RoundRepository } from "../domain/rounds/round_repository.ts";
import { PatientRepository } from "../domain/patients/patient_repository.ts";
import { UserRepository } from "../domain/users/user_repository.ts";
import { Round } from "../domain/rounds/round.ts";
import { HeartRate } from "../domain/parameters/heart_rate.ts";
import { Measurement } from "../domain/parameters/measurement.ts";
import { ID } from "../domain/id.ts";
import { Patient } from "../domain/patients/patient.ts";

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

	async new(patientId: string, userId: string, date: string, parameter: InputParameter) {
		const patientOrError = await this.patientRepository.getById(ID.New(patientId));

		const user = await this.userRepository.get(ID.New(userId));

		const round = new Round(patientOrError.value as Patient);

		const measurement = Measurement.new(parameter.value);
		const heartRate = new HeartRate(measurement, date, user);

		round.addParameter(heartRate);

		await this.roundRepository.save(round);
	}
}

type InputParameter = {
	name: string;
	value: unknown;
};
