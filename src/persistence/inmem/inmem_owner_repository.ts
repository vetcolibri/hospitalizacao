import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";

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
