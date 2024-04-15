import { Owner } from "../../domain/patients/owners/owner.ts";
import { OwnerRepository } from "../../domain/patients/owners/owner_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { OwnerNotFound } from "../../domain/patients/owners/owner_not_found_error.ts";
import { ID } from "shared/id.ts";

export class InmemOwnerRepository implements OwnerRepository {
	#data: Record<string, Owner> = {};

	getAll(): Promise<Owner[]> {
		return Promise.resolve(this.records);
	}

	save(owner: Owner): Promise<void> {
		this.#data[owner.ownerId.value] = owner;
		return Promise.resolve();
	}

	getById(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
		const owner = this.records.find((owner) => owner.ownerId.equals(ownerId));
		if (!owner) return Promise.resolve(left(new OwnerNotFound()));
		return Promise.resolve(right(owner));
	}

	last(): Promise<Owner> {
		const owner = this.records[this.records.length - 1];
		return Promise.resolve(owner);
	}

	get records(): Owner[] {
		return Object.values(this.#data);
	}
}
