import { Either } from "@shared/either.ts";
import { IdValue } from "@shared/id_value.ts";
import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { Owner } from "./owner.ts";
import { OwnerNotFoundError } from "./owner_not_found_error.ts";

export interface OwnerRepository {
	exists(id: IdValue): Promise<boolean>;
	existsWithOrangestId(id: OrangestIdValue): Promise<boolean>;
	findById(id: IdValue): Promise<Either<OwnerNotFoundError, Owner>>;
	findByOrangestId(orangestId: OrangestIdValue): Promise<Either<OwnerNotFoundError, Owner>>;
	save(owner: Owner): Promise<void>;
	remove(owner: Owner): Promise<Either<OwnerNotFoundError, void>>;
}
