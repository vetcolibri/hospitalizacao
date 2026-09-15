import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { HospitalizationNotOpen } from "domain/hospitalization/hospitalization_not_open_error.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { HospitalizationRepository } from "domain/hospitalization/hospitalization_repository.ts";
import { PatientRepository } from "domain/patient/patient_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { UserRepository } from "domain/auth/user_repository.ts";
import { Username } from "domain/auth/username.ts";
import { User } from "domain/auth/user.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

export class BudgetService {
	#budgetRepository: BudgetRepository;
	#userRepository: UserRepository;
	#hospitalizationRepository: HospitalizationRepository;
	#patientRepository: PatientRepository;

	constructor(
		budgetRepository: BudgetRepository,
		userRepository: UserRepository,
		hospitalizationRepository: HospitalizationRepository,
		patientRepository: PatientRepository,
	) {
		this.#budgetRepository = budgetRepository;
		this.#userRepository = userRepository;
		this.#hospitalizationRepository = hospitalizationRepository;
		this.#patientRepository = patientRepository;
	}

	async findAll(): Promise<Budget[]> {
		return await this.#budgetRepository.findAll();
	}

	async update(
		budgetId: string,
		data: BudgetData,
		username: string,
	): Promise<Either<BudgetNotFound | HospitalizationNotFound | HospitalizationNotOpen, void>> {
		const userOrErr = await this.#userRepository.getByUsername(Username.fromString(username));
		if (userOrErr.isLeft()) {
			return left(new PermissionDenied("Utilizador inválido."));
		}

		const user = <User> userOrErr.value;
		if (!user.hasBudgetWritePermission()) {
			return left(
				new PermissionDenied(
					"O nível de Utilizador não lhe permite modificar o Orçamento da hospitalização.",
				),
			);
		}

		const budgetOrErr = await this.#budgetRepository.findById(ID.fromString(budgetId));

		if (budgetOrErr.isLeft()) return left(budgetOrErr.value);

		const budget = budgetOrErr.value;

		// Lê a hospitalização uma primeira vez só para descobrir o paciente a
		// bloquear. A validação que decide é feita DEPOIS do lock, para que um
		// encerramento concorrente não fique pelo caminho (TOCTOU).
		const initialOrErr = await this.#hospitalizationRepository.findByHospitalizationId(
			budget.hospitalizationId,
		);

		if (initialOrErr.isLeft()) return left(initialOrErr.value);

		// Mesmo bloqueio por paciente usado no encerramento: garante que a
		// validação e a escrita ficam serializadas com o end-hospitalization.
		await this.#patientRepository.lockBySystemId(initialOrErr.value.patientId);

		const hospitalizationOrErr = await this.#hospitalizationRepository
			.findByHospitalizationId(budget.hospitalizationId);

		if (hospitalizationOrErr.isLeft()) return left(hospitalizationOrErr.value);

		if (!hospitalizationOrErr.value.isOpen()) {
			return left(new HospitalizationNotOpen());
		}

		budget.update(data.startOn, data.endOn);

		await this.#budgetRepository.update(budget);

		return right(undefined);
	}
}

type BudgetData = {
	startOn: string;
	endOn: string;
};
