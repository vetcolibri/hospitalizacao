import { AlertNotifier } from "@application/alert_notifier.ts";
import { BudgetRepository } from "@domain/budget/budget_repository.ts";
import { OwnerRepository } from "@domain/crm/owner/owner_repository.ts";
import { AlertRepository } from "@domain/hospitalization/alerts/alert_repository.ts";
import { Hospitalization } from "@domain/hospitalization/hospitalization.ts";
import { HospitalizationRepository } from "@domain/hospitalization/hospitalization_repository.ts";
import { Patient, PatientStatus } from "@domain/patient/patient.ts";
import { PatientRepository } from "@domain/patient/patient_repository.ts";
import { Either, left, right } from "@shared/either.ts";
import { EndBudgetError, EndHospitalizationError } from "@shared/errors.ts";
import { ID } from "@shared/id.ts";
import { UserRepository } from "@domain/auth/user_repository.ts";
import { Username } from "@domain/auth/username.ts";
import { User } from "@domain/auth/user.ts";
import { PermissionDenied } from "@domain/auth/permission_denied_error.ts";

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

	async getPatientById(patientId: string): Promise<Either<Error, Patient>> {
		const patientOrErr = await this.#patientRepository.findBySystemId(ID.fromString(patientId));
		if (patientOrErr.isLeft()) return left(patientOrErr.value);
		return right(patientOrErr.value);
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
