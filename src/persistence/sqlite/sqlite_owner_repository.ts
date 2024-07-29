import { DB } from "deps";
import { Either, left, right } from "shared/either.ts";
import { EntityFactory } from "shared/factory.ts";
import { ID } from "shared/id.ts";
import { Owner } from "../../domain/crm/owner/owner.ts";
import { OwnerNotFound } from "../../domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "../../domain/crm/owner/owner_repository.ts";

const factory = new EntityFactory();

export class SQLiteOwnerRepository implements OwnerRepository {
	#db: DB;

	constructor(db: DB) {
		this.#db = db;
	}

	getAll(): Promise<Owner[]> {
		const rows = this.#db.queryEntries("SELECT * FROM owners");

		const owners = rows.map((row) => factory.createOwner(row));

		return Promise.resolve(owners);
	}

	getById(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
		const rows = this.#db.queryEntries(
			"SELECT * FROM owners WHERE owner_id = :ownerId limit 1",
			{ ownerId: ownerId.value },
		);

		if (rows.length === 0) return Promise.resolve(left(new OwnerNotFound()));

		const owner = factory.createOwner(rows[0]);

		return Promise.resolve(right(owner));
	}

	save(owner: Owner): Promise<void> {
		this.#db.queryEntries(
			"INSERT INTO owners (owner_id, owner_name, phone_number, whatsapp) VALUES (:ownerId, :name, :phoneNumber, :whatsapp)",
			{
				ownerId: owner.ownerId.value,
				name: owner.name,
				phoneNumber: owner.phoneNumber,
				whatsapp: owner.whatsapp,
			},
		);

		return Promise.resolve(undefined);
	}

	last(): Promise<Owner> {
		throw new Error("Method not implemented.");
	}
}
