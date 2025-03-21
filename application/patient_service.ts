import { AlertNotifier } from "application/alert_notifier.ts";
import { BudgetBuilder } from "domain/budget/budget_builder.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { AlertRepository } from "domain/hospitalization/alerts/alert_repository.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { HospitalizationBuilder } from "domain/hospitalization/hospitalization_builder.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { InvalidDate } from "domain/hospitalization/invalid_date_error.ts";
import { InvalidNumber } from "domain/hospitalization/invalid_number_error.ts";
import { Patient, PatientStatus } from "domain/patient/patient.ts";
import { PatientAlreadyHospitalized } from "domain/patient/patient_already_hospitalized_error.ts";
import { PatientBuilder } from "domain/patient/patient_builder.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ErrorMessage } from "shared/error_messages.ts";
import {
	EndBudgetError,
	EndHospitalizationError,
	NewHospitalizationError,
	NewPatientError,
} from "shared/errors.ts";
import { ID } from "shared/id.ts";
import { UserRepository } from "domain/auth/user_repository.ts";
import { Username } from "domain/auth/username.ts";
import { User } from "domain/auth/user.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

export class PatientService {
	#patientRepository: PatientRepository;
	#ownerRepository: OwnerRepository;
	#hospitalizationRepository: HospitalizationRepository;
	#budgetRepository: BudgetRepository;
	#alertRepository: AlertRepository;
	#userRepository: UserRepository;
	#alertNotifier: AlertNotifier;

	constructor(
		partientRepository: PatientRepository,
		ownerRepository: OwnerRepository,
		hospitalizationRepository: HospitalizationRepository,
		budgetRepository: BudgetRepository,
		alertRepository: AlertRepository,
		userRepository: UserRepository,
		alertNotifier: AlertNotifier,
	) {
		this.#patientRepository = partientRepository;
		this.#ownerRepository = ownerRepository;
		this.#hospitalizationRepository = hospitalizationRepository;
		this.#budgetRepository = budgetRepository;
		this.#alertRepository = alertRepository;
		this.#userRepository = userRepository;
		this.#alertNotifier = alertNotifier;
	}

	/**
	 * Lista os pacientes hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async listHospitalizad(): Promise<Patient[]> {
		return await this.#patientRepository.findByStatus(PatientStatus.Hospitalized);
	}

	/**
	 * Lista os pacientes não hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async listNonHospitalized(): Promise<Patient[]> {
		return await this.#patientRepository.findByStatus(PatientStatus.Discharged);
	}

	/**
	 * Cria uma nova hospitalização
	 * @param patientId
	 * @param hospitalizationData
	 * @returns {Promise<Either<Error, void>>}
	 */
	async newHospitalization(
		patientId: string,
		data: HospitalizationData,
	): Promise<Either<NewHospitalizationError, void>> {
		const patientOrErr = await this.#patientRepository.findBySystemId(ID.fromString(patientId));
		if (patientOrErr.isLeft()) {
			return left(patientOrErr.value);
		}

		const voidOrErr = this.#verifyHospitalizationData(data);
		if (voidOrErr.isLeft()) {
			return left(voidOrErr.value);
		}

		const patient = patientOrErr.value;
		if (patient.isHospitalized()) {
			return left(new PatientAlreadyHospitalized(patient.name));
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
		await this.#hospitalizationRepository.save(hospitalizationOrErr.value);

		patient.hospitalize();
		await this.#patientRepository.update(patient);

		return right(undefined);
	}

	async getPatientById(patientId: string): Promise<Either<Error, Patient>> {
		const patientOrErr = await this.#patientRepository.findBySystemId(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);
		return right(patientOrErr.value);
	}

	/**
	 * Cria um novo paciente
	 * @param data
	 * @returns {Promise<Either<NewPatientError, void>>}
	 */
	async newPatient(data: NewPatientData): Promise<Either<NewPatientError, void>> {
		const userOrErr = await this.#userRepository.getByUsername(
			Username.fromString(data.username),
		);
		const user = <User> userOrErr.value;
		if (!user.hasHospitalizationWritePermission()) {
			return left(
				new PermissionDenied(
					"O nível de Utilizador não lhe permite hospitalizar pacientes.",
				),
			);
		}

		const { patientData, ownerData, hospitalizationData, budgetData } = data;

		let patientOrErr = await this.#patientRepository.findByPatientId(
			ID.fromString(patientData.patientId),
		);

		if (patientOrErr.isRight() && patientOrErr.value.status === PatientStatus.Hospitalized) {
			return left(new PatientAlreadyHospitalized(patientOrErr.value.name));
		}

		if (this.#isInvalidDate(patientData.birthDate)) {
			return left(new InvalidDate(ErrorMessage.InvalidBirthDate));
		}

		const voidOrErr = this.#verifyHospitalizationData(hospitalizationData);
		if (voidOrErr.isLeft()) return left(voidOrErr.value);

		await this.#buildOwner(ownerData);

		if (patientOrErr.isLeft()) {
			patientOrErr = new PatientBuilder()
				.withPatientId(patientData.patientId)
				.withName(patientData.name)
				.withOwnerId(ownerData.ownerId)
				.withSpecie(patientData.specie)
				.withBreed(patientData.breed)
				.withBirthDate(patientData.birthDate)
				.build();

			if (patientOrErr.isLeft()) {
				return left(patientOrErr.value);
			}
			await this.#patientRepository.save(patientOrErr.value);
		}

		const hospitalizationOrErr = new HospitalizationBuilder()
			.withPatientId(patientOrErr.value.systemId.value)
			.withEntryDate(hospitalizationData.entryDate)
			.withDischargeDate(hospitalizationData.dischargeDate)
			.withWeight(hospitalizationData.weight)
			.withComplaints(hospitalizationData.complaints)
			.withDiagnostics(hospitalizationData.diagnostics)
			.build();

		if (hospitalizationOrErr.isLeft()) {
			return left(hospitalizationOrErr.value);
		}

		await this.#hospitalizationRepository.save(hospitalizationOrErr.value);

		const hospitalizationId = hospitalizationOrErr.value.hospitalizationId;
		const budgetOrErr = new BudgetBuilder()
			.withHospitalizationId(hospitalizationId.value)
			.withStartOn(budgetData.startOn)
			.withEndOn(budgetData.endOn)
			.withStatus(budgetData.status)
			.build();

		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);
		await this.#budgetRepository.save(budgetOrErr.value);

		patientOrErr.value.hospitalize();
		await this.#patientRepository.update(patientOrErr.value);

		return right(undefined);
	}

	async endHospitalization(
		patientId: string,
		username: string,
	): Promise<Either<EndHospitalizationError, void>> {
		const userOrErr = await this.#userRepository.getByUsername(
			Username.fromString(username),
		);
		const user = <User> userOrErr.value;
		if (!user.hasHospitalizationWritePermission()) {
			return left(
				new PermissionDenied(
					"O nível de Utilizador não lhe permite encerrar a hospitalização do paciente.",
				),
			);
		}

		const patientOrErr = await this.#patientRepository.findBySystemId(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const hospitalizationOrErr = await this.#hospitalizationRepository.findByPatientId(
			ID.fromString(patientId),
		);
		if (hospitalizationOrErr.isLeft()) return left(hospitalizationOrErr.value);

		const patient = <Patient> patientOrErr.value;
		const hospitalization = <Hospitalization> hospitalizationOrErr.value;

		const budgetOrErr = await this.#budgetRepository.findByHospitalizationId(
			hospitalization.hospitalizationId,
		);
		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);

		patient.discharge();

		hospitalization.close();

		if (budgetOrErr.value.unpaid()) {
			patient.dischargeWithUnpaidBudget();
		}

		if (budgetOrErr.value.pending()) {
			patient.dischargeWithPendingBudget();
		}

		if (budgetOrErr.value.itWasSent()) {
			patient.dischargeWithBudgetSent();
		}

		await this.#hospitalizationRepository.update(hospitalization);

		await this.#patientRepository.update(patient);

		await this.#cancelAlerts(patientId);

		return right(undefined);
	}

	async endBudget(
		patientId: string,
		hospitalizationId: string,
		status: string,
		username: string,
	): Promise<Either<EndBudgetError, void>> {
		const userOrErr = await this.#userRepository.getByUsername(Username.fromString(username));
		const user = <User> userOrErr.value;
		if (!user.hasBudgetWritePermission()) {
			return left(
				new PermissionDenied(
					"O nível de Utilizador não lhe permite modificar o Orçamento da hospitalização.",
				),
			);
		}

		const patientOrErr = await this.#patientRepository.findBySystemId(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;

		const budgetOrErr = await this.#budgetRepository.findByHospitalizationId(
			ID.fromString(hospitalizationId),
		);

		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);

		budgetOrErr.value.changeStatus(status);

		if (budgetOrErr.value.unpaid() && patient.hasBeenDischarged()) {
			patient.dischargeWithUnpaidBudget();
		}

		if (budgetOrErr.value.pending() && patient.hasBeenDischarged()) {
			patient.dischargeWithPendingBudget();
		}

		if (budgetOrErr.value.itWasSent() && patient.hasBeenDischarged()) {
			patient.dischargeWithBudgetSent();
		}

		if (budgetOrErr.value.isPaid() && patient.hasBeenDischarged()) {
			patient.discharge();
		}

		await this.#budgetRepository.update(budgetOrErr.value);

		await this.#patientRepository.update(patient);

		return right(undefined);
	}

	#isInvalidNumber(length: number, limit: number): boolean {
		return length > limit;
	}

	#isInvalidDate(date: string): boolean {
		return new Date(date).getTime() > new Date().getTime();
	}

	#verifyHospitalizationData(
		data: HospitalizationData,
	): Either<InvalidDate | InvalidNumber, void> {
		if (this.#isInvalidNumber(data.complaints.length, 10)) {
			return left(new InvalidNumber(ErrorMessage.InvalidComplaintsNumber));
		}

		if (this.#isInvalidNumber(data.diagnostics.length, 5)) {
			return left(new InvalidNumber(ErrorMessage.InvalidDiagnosticsNumber));
		}

		if (this.#isInvalidDate(data.entryDate)) {
			return left(new InvalidDate(ErrorMessage.InvalidEntryDate));
		}

		return right(undefined);
	}

	async #buildOwner(ownerData: OwnerData): Promise<void> {
		const ownerOrErr = await this.#ownerRepository.getById(ID.fromString(ownerData.ownerId));

		if (ownerOrErr.isRight()) return;

		const owner = new Owner(
			ownerData.ownerId,
			ownerData.name,
			ownerData.phoneNumber,
			ownerData.whatsapp,
		);

		await this.#ownerRepository.save(owner);

		return;
	}

	async #cancelAlerts(patientId: string): Promise<void> {
		const alerts = await this.#alertRepository.findActivesByPatientId(ID.fromString(patientId));

		if (alerts.length === 0) return;

		for (const alert of alerts) {
			alert.cancel();
			this.#alertNotifier.cancel(alert.alertId.value);
		}

		await this.#alertRepository.updateAll(alerts);

		return;
	}
}

type NewPatientData = {
	patientData: PatientData;
	hospitalizationData: HospitalizationData;
	ownerData: OwnerData;
	budgetData: BudgetData;
	username: string;
};

type PatientData = {
	patientId: string;
	name: string;
	specie: string;
	breed: string;
	birthDate: string;
};

type OwnerData = {
	ownerId: string;
	name: string;
	phoneNumber: string;
	whatsapp: boolean;
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
