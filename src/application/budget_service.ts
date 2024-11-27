import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { BudgetRepository } from "domain/budget/budget_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { UserRepository } from "domain/auth/user_repository.ts";
import { Username } from "domain/auth/username.ts";
import { User } from "domain/auth/user.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

export class BudgetService {
	#budgetRepository: BudgetRepository;
	#userRepository: UserRepository;

	constructor(budgetRepository: BudgetRepository, userRepository: UserRepository) {
		this.#budgetRepository = budgetRepository;
		this.#userRepository = userRepository;
	}

	async findAll(): Promise<Budget[]> {
		return await this.#budgetRepository.findAll();
	}

	async update(
		budgetId: string,
		data: BudgetData,
		username: string,
	): Promise<Either<BudgetNotFound, void>> {
		const userOrErr = await this.#userRepository.getByUsername(Username.fromString(username));
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

		budgetOrErr.value.update(data.startOn, data.endOn);

		await this.#budgetRepository.update(budgetOrErr.value);

		return right(undefined);
	}
}

type BudgetData = {
	startOn: string;
	endOn: string;
};
