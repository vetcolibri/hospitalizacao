import { OwnerNotFound } from "./owner_not_found_error.ts";
import { Owner } from "./owner.ts";
import { Either } from "shared/either.ts";
import { ID } from "shared/id.ts";

export interface OwnerRepository {
	getAll(): Promise<Owner[]>;
	getById(ownerId: ID): Promise<Either<OwnerNotFound, Owner>>;
	save(owner: Owner): Promise<void>;
	last(): Promise<Owner>;
}
