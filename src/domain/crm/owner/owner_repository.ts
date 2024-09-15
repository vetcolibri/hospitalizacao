import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface OwnerRepository {
	getById(ownerId: ID): Promise<Either<OwnerNotFound, Owner>>;
	getAll(): Promise<Owner[]>;
	save(owner: Owner): Promise<void>;
	last(): Promise<Owner>;
}
