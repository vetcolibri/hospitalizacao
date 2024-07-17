import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { Owner } from "../domain/crm/owner/owner.ts";
import { OwnerNotFound } from "../domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "../domain/crm/owner/owner_repository.ts";

export class OwnerService {
	#ownerRepository: OwnerRepository;

	constructor(ownerRepository: OwnerRepository) {
		this.#ownerRepository = ownerRepository;
	}

	async getAll(): Promise<Owner[]> {
		return await this.#ownerRepository.getAll();
	}

	async findOwner(ownerId: string): Promise<Either<OwnerNotFound, Owner>> {
		const ownerOrErr = await this.#ownerRepository.getById(ID.fromString(ownerId));
		if (ownerOrErr.isLeft()) return left(ownerOrErr.value);

		return right(ownerOrErr.value);
	}
}
