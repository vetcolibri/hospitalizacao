import { Client } from "deps";
import { Owner } from "domain/crm/owner/owner.ts";
import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { OwnerRepository } from "domain/crm/owner/owner_repository.ts";
import { Either, left, right } from "shared/either.ts";
import { ID } from "shared/id.ts";

function ownerFactory(row: OwnerModel): Owner {
    return new Owner(row.owner_id, row.name, row.phone_number, row.whatsapp);
}

export class PostgresOwnerRepository implements OwnerRepository {
    constructor(private client: Client) {}

    async getById(ownerId: ID): Promise<Either<OwnerNotFound, Owner>> {
        const result = await this.client.queryObject<OwnerModel>(
            "SELECT * FROM owners WHERE owner_id = $ID LIMIT 1",
            {
                id: ownerId.value,
            },
        );

        if (result.rows.length === 0) return left(new OwnerNotFound());

        return right(ownerFactory(result.rows[0]));
    }

    async getAll(): Promise<Owner[]> {
        const result = await this.client.queryObject<OwnerModel>("SELECT * FROM owners");
        return result.rows.map(ownerFactory);
    }

    async save(owner: Owner): Promise<void> {
        await this.client.queryObject("INSERT INTO owners VALUES ($1, $2, $3, $4)", [
            owner.ownerId.value,
            owner.name,
            owner.phoneNumber,
            owner.whatsapp,
        ]);
    }

    async lockById(ownerId: ID): Promise<void> {
        // Bloqueia a ficha do tutor até ao fim da transacção, para que edições
        // concorrentes não se sobreponham a partir de leituras desactualizadas.
        await this.client.queryObject(
            "SELECT owner_id FROM owners WHERE owner_id = $OWNER_ID FOR UPDATE",
            { owner_id: ownerId.value },
        );
    }

    async update(owner: Owner): Promise<void> {
        // Actualiza apenas os dados globais editáveis, preservando o identificador
        // e todos os restantes campos/relações do tutor.
        await this.client.queryObject(
            "UPDATE owners SET name = $NAME, phone_number = $PHONE_NUMBER, whatsapp = $WHATSAPP WHERE owner_id = $OWNER_ID",
            {
                name: owner.name,
                phone_number: owner.phoneNumber,
                whatsapp: owner.whatsapp,
                owner_id: owner.ownerId.value,
            },
        );
    }

    last(): Promise<Owner> {
        throw new Error("Method not implemented.");
    }
}

interface OwnerModel {
    owner_id: string;
    name: string;
    phone_number: string;
    whatsapp: boolean;
}
