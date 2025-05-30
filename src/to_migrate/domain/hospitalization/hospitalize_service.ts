import { Either, left, right } from "@shared/either.ts";
import { ErrorMessage } from "@shared/error_messages.ts";
import { NewPatientError } from "@shared/errors.ts";
import { ID } from "@shared/id.ts";
import { PermissionDenied } from "@domain/auth/permission_denied_error.ts";
import { Username } from "@domain/auth/username.ts";
import { BudgetBuilder } from "@domain/budget/budget_builder.ts";
import { HospitalizationBuilder } from "@domain/hospitalization/hospitalization_builder.ts";
import { InvalidDateError } from "@domain/hospitalization/invalid_date_error.ts";
import { UserRepository } from "@domain/auth/user_repository.ts";
import { OwnerRepository } from "@domain/crm/owner/owner_repository.ts";
import { BudgetRepository } from "@domain/budget/budget_repository.ts";
import { Owner } from "@domain/crm/owner/owner.ts";
import { PatientRepository } from "@domain/patient/patient_repository.ts";
import { HospitalizationRepository } from "@domain/hospitalization/hospitalization_repository.ts";
import { InvalidNumber } from "@domain/hospitalization/invalid_number_error.ts";
import { PatientAlreadyHospitalizedError } from "@domain/patient/patient_already_hospitalized_error.ts";
import { Patient } from "@domain/patient/patient.ts";
import { Hospitalization } from "@domain/hospitalization/hospitalization.ts";
import { Budget } from "@domain/budget/budget.ts";
import { BirthDate } from "@domain/patient/birth_date.ts";

type PatientData = {
	patientId: string;
	name?: string;
	specie?: string;
	breed?: string;
	birthDate?: string;
};

type OwnerData = {
	ownerId: string;
	name?: string;
	phoneNumber?: string;
	whatsapp?: boolean;
};

type HospitalizationData = {
	weight: number;
	complaints: string[];
	diagnostics: string[];
	entryDate: string;
	dischargeDate?: string;
};

type BudgetData = {
	startOn: string;
	endOn: string;
	status: string;
};

export class HospitalizeService {
	#userRepository: UserRepository;
	#ownerRepository: OwnerRepository;
	#patientRepository: PatientRepository;
	#hospitalizationRepository: HospitalizationRepository;
	#budgetRepository: BudgetRepository;

	constructor(
		userRepository: UserRepository,
		ownerRepository: OwnerRepository,
		patientRepository: PatientRepository,
		hospitalizationRepository: HospitalizationRepository,
		budgetRepository: BudgetRepository,
	) {
		this.#userRepository = userRepository;
		this.#ownerRepository = ownerRepository;
		this.#patientRepository = patientRepository;
		this.#hospitalizationRepository = hospitalizationRepository;
		this.#budgetRepository = budgetRepository;
	}

	/**
	 * Hospitaliza um paciente
	 * @param data
	 * @returns {Promise<Either<Error, void>>}
	 */
	async hospitalize(
		username: string,
		patientData: PatientData,
		ownerData: OwnerData,
		hospitalizationData: HospitalizationData,
		budgetData: BudgetData,
	): Promise<Either<Error, void>> {
		const voidOrPermissionDenied = await verifyPermissions(this.#userRepository, username);
		if (voidOrPermissionDenied.isLeft()) {
			return left(voidOrPermissionDenied.value);
		}

		const ownerOrErr = await buildOwner(this.#ownerRepository, ownerData);
		if (ownerOrErr.isLeft()) {
			return left(ownerOrErr.value);
		}

		const patientOrErr = await buildPatient(this.#patientRepository, patientData, ownerData);
		if (patientOrErr.isLeft()) {
			return left(patientOrErr.value);
		}

		const hospitalizationOrErr = await buildHospitalization(
			this.#hospitalizationRepository,
			hospitalizationData,
			patientOrErr.value,
		);
		if (hospitalizationOrErr.isLeft()) {
			return left(hospitalizationOrErr.value);
		}

		const budgetOrErr = await buildBudget(
			this.#budgetRepository,
			budgetData,
			hospitalizationOrErr.value,
		);
		if (budgetOrErr.isLeft()) {
			return left(budgetOrErr.value);
		}

		patientOrErr.value.hospitalize();
		await this.#patientRepository.update(patientOrErr.value);

		return right(undefined);
	}
}

async function verifyPermissions(
	repository: UserRepository,
	username: string,
): Promise<Either<PermissionDenied, void>> {
	const userOrErr = await repository.getByUsername(Username.fromString(username));

	if (userOrErr.isLeft() || !userOrErr.value.hasHospitalizationWritePermission()) {
		return left(
			new PermissionDenied(
				"O nível de Utilizador não lhe permite hospitalizar pacientes.",
			),
		);
	}

	return right(undefined);
}

async function buildOwner(
	repository: OwnerRepository,
	ownerData: OwnerData,
): Promise<Either<NewPatientError, Owner>> {
	const ownerOrErr = await repository.getById(ID.fromString(ownerData.ownerId));

	if (ownerOrErr.isRight() && ownerData.phoneNumber) {
		ownerOrErr.value.changePhoneNumber(ownerData.phoneNumber, ownerData.whatsapp ?? false);
		await repository.update(ownerOrErr.value);
	}

	if (ownerOrErr.isRight()) {
		return right(ownerOrErr.value);
	}

	const owner = new Owner(
		ownerData.ownerId,
		ownerData.name!,
		ownerData.phoneNumber!,
		ownerData.whatsapp,
	);

	await repository.save(owner);

	return right(owner);
}

async function buildPatient(
	repository: PatientRepository,
	patientData: PatientData,
	ownerData: OwnerData,
): Promise<Either<NewPatientError | InvalidDateError, Patient>> {
	let patientOrErr = await repository.findByPatientId(ID.fromString(patientData.patientId));
	if (patientOrErr.isRight()) {
		patientOrErr.value.changeOwner(ID.fromString(ownerData.ownerId));
		await repository.update(patientOrErr.value);
		return right(patientOrErr.value);
	}

	if (
		!patientData.birthDate || new Date(patientData.birthDate).getTime() > new Date().getTime()
	) {
		return left(new InvalidDateError(ErrorMessage.InvalidBirthDate));
	}

	patientOrErr = Patient.builder()
		.withPatientId(ID.fromString(patientData.patientId))
		.withName(patientData.name!)
		.withOwnerId(ID.fromString(ownerData.ownerId))
		.withSpecie(patientData.specie!)
		.withBreed(patientData.breed!)
		.withBirthDate(new BirthDate(patientData.birthDate))
		.build();

	if (patientOrErr.isLeft()) {
		return left(patientOrErr.value);
	}

	patientOrErr.value.discharge();

	await repository.save(patientOrErr.value);
	return right(patientOrErr.value);
}

async function buildHospitalization(
	repository: HospitalizationRepository,
	data: HospitalizationData,
	patient: Patient,
): Promise<Either<NewPatientError | InvalidNumber, Hospitalization>> {
	if (data.complaints.length > 10) {
		return left(new InvalidNumber(ErrorMessage.InvalidComplaintsNumber));
	}

	if (data.diagnostics.length > 5) {
		return left(new InvalidNumber(ErrorMessage.InvalidDiagnosticsNumber));
	}

	if (new Date(data.entryDate).getTime() > new Date().getTime()) {
		return left(new InvalidDateError(ErrorMessage.InvalidEntryDate));
	}

	if (data.dischargeDate && new Date(data.dischargeDate).getTime() < new Date().getTime()) {
		return left(new InvalidDateError(ErrorMessage.InvalidEntryDate));
	}

	if (patient.isHospitalized()) {
		return left(new PatientAlreadyHospitalizedError(patient.name));
	}

	const hospitalizationOrErr = new HospitalizationBuilder()
		.withPatientId(patient.systemId.value)
		.withEntryDate(data.entryDate)
		.withDischargeDate(data.dischargeDate)
		.withWeight(data.weight)
		.withComplaints(data.complaints)
		.withDiagnostics(data.diagnostics)
		.build();

	if (hospitalizationOrErr.isLeft()) {
		return left(hospitalizationOrErr.value);
	}

	await repository.save(hospitalizationOrErr.value);

	return right(hospitalizationOrErr.value);
}

async function buildBudget(
	repository: BudgetRepository,
	data: BudgetData,
	hospitalization: Hospitalization,
): Promise<Either<NewPatientError, Budget>> {
	const budgetOrErr = new BudgetBuilder()
		.withHospitalizationId(hospitalization.hospitalizationId.value)
		.withStartOn(data.startOn)
		.withEndOn(data.endOn)
		.withStatus(data.status)
		.build();

	if (budgetOrErr.isLeft()) {
		return left(budgetOrErr.value);
	}

	await repository.save(budgetOrErr.value);

	return right(budgetOrErr.value);
}
