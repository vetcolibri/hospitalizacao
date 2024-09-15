import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";
import { Client } from "deps";

export class PostgresOwnerRepository implements OwnerRepository {
    constructor(private client: Client) {}

    async getById(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
        const result = await this.client.queryObject<Owner>(
            "SELECT * FROM owners WHERE owner_id = $ID LIMIT 1",
            {
                id: ownerId.value,
            },
        );

        if (result.rows.length === 0) return left(new OwnerNotFound());

        return right(result.rows[0]);
    }

    async getAll(): Promise<Owner[]> {
        return (await this.client.queryObject<Owner>("SELECT * FROM owners")).rows;
    }

    async save(owner: Owner): Promise<void> {
        await this.client.queryObject("INSERT INTO owner VALUES ($1, $2, $3, $4)", [
            owner.ownerId.value,
            owner.name,
            owner.phoneNumber,
            owner.whatsapp,
        ]);
    }

    last(): Promise<Owner> {
        throw new Error("Method not implemented.");
    }
}
