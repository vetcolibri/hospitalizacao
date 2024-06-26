import { Hospitalization } from "domain/patients/hospitalizations/hospitalization.ts";
import { Patient } from "domain/patients/patient.ts";
import { PatientAlreadyHospitalized } from "domain/patients/patient_already_hospitalized_error.ts";
import { PatientRepository } from "domain/patients/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ErrorMessage } from "shared/error_messages.ts";
import {
	EndBudgetError,
	EndHospitalizationError,
	NewHospitalizationError,
	NewPatientError,
} from "shared/errors.ts";
import { ID } from "shared/id.ts";
import { BudgetBuilder } from "../domain/patients/hospitalizations/budget_builder.ts";
import { BudgetRepository } from "../domain/patients/hospitalizations/budget_repository.ts";
import { HospitalizationBuilder } from "../domain/patients/hospitalizations/hospitalization_builder.ts";
import { HospitalizationRepository } from "../domain/patients/hospitalizations/hospitalization_repository.ts";
import { InvalidDate } from "../domain/patients/hospitalizations/invalid_date_error.ts";
import { InvalidNumber } from "../domain/patients/hospitalizations/invalid_number_error.ts";
import { Owner } from "../domain/patients/owners/owner.ts";
import { OwnerRepository } from "../domain/patients/owners/owner_repository.ts";
import { PatientBuilder } from "../domain/patients/patient_builder.ts";
import { PatientIdAlreadyExists } from "../domain/patients/patient_id_already_exists_error.ts";

export class PatientService {
	#patientRepository: PatientRepository;
	#ownerRepository: OwnerRepository;
	#hospitalizationRepository: HospitalizationRepository;
	#budgetRepository: BudgetRepository;

	constructor(
		partientRepository: PatientRepository,
		ownerRepository: OwnerRepository,
		hospitalizationRepository: HospitalizationRepository,
		budgetRepository: BudgetRepository,
	) {
		this.#patientRepository = partientRepository;
		this.#ownerRepository = ownerRepository;
		this.#hospitalizationRepository = hospitalizationRepository;
		this.#budgetRepository = budgetRepository;
	}

	/**
	 * Lista os pacientes hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async listHospitalizad(): Promise<Patient[]> {
		return await this.#patientRepository.hospitalized();
	}

	/**
	 * Lista os pacientes não hospitalizados
	 * @returns {Promise<Patient[]>}
	 */
	async listNonHospitalized(): Promise<Patient[]> {
		return await this.#patientRepository.nonHospitalized();
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
		const patientOrErr = await this.#patientRepository.getById(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const voidOrErr = this.#verifyHospitalizationData(data);
		if (voidOrErr.isLeft()) return left(voidOrErr.value);

		const patient = patientOrErr.value;
		if (patient.isHospitalized()) return left(new PatientAlreadyHospitalized(patient.name));

		const hospitalizationOrErr = new HospitalizationBuilder()
			.withPatientId(patient.systemId.value)
			.withEntryDate(data.entryDate)
			.withDischargeDate(data.dischargeDate)
			.withWeight(data.weight)
			.withComplaints(data.complaints)
			.withDiagnostics(data.diagnostics)
			.build();

		if (hospitalizationOrErr.isLeft()) return left(hospitalizationOrErr.value);
		await this.#hospitalizationRepository.save(hospitalizationOrErr.value);

		patient.hospitalize();

		await this.#patientRepository.update(patient);

		return right(undefined);
	}

	/**
	 * Cria um novo paciente
	 * @param data
	 * @returns {Promise<Either<NewPatientError, void>>}
	 */
	async newPatient(data: NewPatientData): Promise<Either<NewPatientError, void>> {
		const { patientData, ownerData, hospitalizationData, budgetData } = data;

		const patientExists = await this.#patientRepository.exists(
			ID.fromString(patientData.patientId),
		);
		if (patientExists) return left(new PatientIdAlreadyExists());

		if (this.#isInvalidDate(patientData.birthDate)) {
			return left(new InvalidDate(ErrorMessage.InvalidBirthDate));
		}

		const voidOrErr = this.#verifyHospitalizationData(hospitalizationData);
		if (voidOrErr.isLeft()) return left(voidOrErr.value);

		await this.#buildOwner(ownerData);

		const patientOrErr = new PatientBuilder()
			.withPatientId(patientData.patientId)
			.withName(patientData.name)
			.withOwnerId(ownerData.ownerId)
			.withSpecie(patientData.specie)
			.withBreed(patientData.breed)
			.withBirthDate(patientData.birthDate)
			.build();

		if (patientOrErr.isLeft()) return left(patientOrErr.value);
		await this.#patientRepository.save(patientOrErr.value);

		const hospitalizationOrErr = new HospitalizationBuilder()
			.withPatientId(patientOrErr.value.systemId.value)
			.withEntryDate(hospitalizationData.entryDate)
			.withDischargeDate(hospitalizationData.dischargeDate)
			.withWeight(hospitalizationData.weight)
			.withComplaints(hospitalizationData.complaints)
			.withDiagnostics(hospitalizationData.diagnostics)
			.build();

		if (hospitalizationOrErr.isLeft()) return left(hospitalizationOrErr.value);
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

		return right(undefined);
	}

	async endHospitalization(
		patientId: string,
	): Promise<Either<EndHospitalizationError, void>> {
		const patientOrErr = await this.#patientRepository.getById(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const hospitalizationOrErr = await this.#hospitalizationRepository.open(
			ID.fromString(patientId),
		);
		if (hospitalizationOrErr.isLeft()) return left(hospitalizationOrErr.value);

		const patient = <Patient> patientOrErr.value;
		const hospitalization = <Hospitalization> hospitalizationOrErr.value;

		const budget = await this.#budgetRepository.getByHospitalizationId(
			hospitalization.hospitalizationId,
		);

		patient.discharge();

		hospitalization.close();

		if (budget.unpaid()) {
			patient.dischargeWithUnpaidBudget();
		}

		if (budget.pending()) {
			patient.dischargeWithPendingBudget();
		}

		if (budget.itWasSent()) {
			patient.dischargeWithBudgetSent();
		}

		await this.#hospitalizationRepository.update(hospitalization);

		await this.#patientRepository.update(patient);

		return right(undefined);
	}

	async endBudget(
		patientId: string,
		hospitalizationId: string,
		status: string,
	): Promise<Either<EndBudgetError, void>> {
		const patientOrErr = await this.#patientRepository.getById(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);

		const patient = patientOrErr.value;

		if (patient.alreadyDischarged()) return left(new Error("Patient already discharged"));

		const budget = await this.#budgetRepository.getByHospitalizationId(
			ID.fromString(hospitalizationId),
		);

		budget.changeStatus(status);

		if (budget.unpaid() && patient.hasDischarged()) {
			patient.dischargeWithUnpaidBudget();
		}

		if (budget.pending() && patient.hasDischarged()) {
			patient.dischargeWithPendingBudget();
		}

		if (budget.itWasSent() && patient.hasDischarged()) {
			patient.dischargeWithBudgetSent();
		}

		if (budget.isPaid() && patient.hasDischarged()) {
			patient.discharge();
		}

		await this.#budgetRepository.update(budget);

		await this.#patientRepository.update(patient);

		return right(undefined);
	}

	#isInvalidNumber(length: number, limit: number): boolean {
		return length > limit;
	}

	#isInvalidDate(date: string): boolean {
		return new Date(date).getTime() > new Date().getTime();
	}

	#verifyHospitalizationData(data: HospitalizationData): Either<Error, void> {
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

		const owner = new Owner(ownerData.ownerId, ownerData.name, ownerData.phoneNumber);

		await this.#ownerRepository.save(owner);

		return;
	}
}

type NewPatientData = {
	patientData: PatientData;
	hospitalizationData: HospitalizationData;
	ownerData: OwnerData;
	budgetData: BudgetData;
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
