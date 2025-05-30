import { Owner } from "@domain/crm/owner/owner.ts";
import owners from "@infra/persistence/fixed/fixed_owners.json" with { type: "json" };
import { InmemOwnerRepository } from "@infra/persistence/inmem/inmem_owner_repository.ts";

export class FixedOwnerRepository extends InmemOwnerRepository {
	constructor() {
		super(
			owners.map((d) =>
				new Owner(
					d.ownerId,
					d.name,
					d.phone,
					d.whatsapp,
				)
			),
		);
	}
}
