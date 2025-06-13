import { IdValue } from "@shared/id_value.ts";
import { Owner } from "./owner.ts";
import { OwnerRepository } from "./owner_repository.ts";
import { Either, left, right } from "@shared/either.ts";
import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { OwnerNotFoundError } from "./owner_not_found_error.ts";

const FIND_BY_ID_CAUSE = "InmemOwnerRepository:findById";
const FIND_BY_ORANGEST_ID_CAUSE = "InmemOwnerRepository:findByOrangestId";
const REMOVE_CAUSE = "InmemOwnerRepository:remove";

export class InmemOwnerRepository implements OwnerRepository {
	#owners: Map<string, Owner>;

	constructor() {
		this.#owners = new Map();
	}

	exists(id: IdValue): Promise<boolean> {
		return Promise.resolve(this.#owners.has(id.value));
	}

	existsWithOrangestId(id: OrangestIdValue): Promise<boolean> {
		return Promise.resolve(
			this.#owners.values()
				.some(({ orangestId }) => orangestId.value === id.value),
		);
	}

	findById(id: IdValue): Promise<Either<OwnerNotFoundError, Owner>> {
		const owner = this.#owners.get(id.value);

		if (!owner) {
			return Promise.resolve(left(new OwnerNotFoundError(FIND_BY_ID_CAUSE, id)));
		}

		return Promise.resolve(right(owner));
	}

	findByOrangestId(id: OrangestIdValue): Promise<Either<OwnerNotFoundError, Owner>> {
		const owner = this.#owners.values()
			.find(({ orangestId }) => orangestId.value === id.value);

		if (!owner) {
			return Promise.resolve(left(new OwnerNotFoundError(FIND_BY_ORANGEST_ID_CAUSE, id)));
		}

		return Promise.resolve(right(owner));
	}

	save(owner: Owner): Promise<void> {
		this.#owners.set(owner.id.value, owner);

		return Promise.resolve();
	}

	remove(owner: Owner): Promise<Either<OwnerNotFoundError, void>> {
		if (!this.#owners.has(owner.id.value)) {
			return Promise.resolve(left(new OwnerNotFoundError(REMOVE_CAUSE, owner.id)));
		}

		this.#owners.delete(owner.id.value);

		return Promise.resolve(right(undefined));
	}
}
