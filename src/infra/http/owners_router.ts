import { OwnerService } from "application/owner_service.ts";
import { Context, Router } from "deps";
import { ContextWithParams } from "infra/http/context_with_params.ts";
import { sendNotFound, sendOk } from "infra/http/responses.ts";
import { Owner } from "../../domain/crm/owner/owner.ts";

interface OwnerDTO {
	ownerId: string;
	name: string;
	phoneNumber: string;
}

function toOwnerDTO(owner: Owner): OwnerDTO {
	return {
		ownerId: owner.ownerId.value,
		name: owner.name,
		phoneNumber: owner.phoneNumber,
	};
}

export default function (service: OwnerService) {
	const listOwnerHandler = async (context: Context) => {
		const owners = await service.getAll();
		sendOk(context, owners.map(toOwnerDTO));
	};

	const findOwnerHandler = async (ctx: ContextWithParams) => {
		const ownerId = ctx.params.ownerId;
		const ownerOrErr = await service.findOwner(ownerId);

		if (ownerOrErr.isLeft()) {
			sendNotFound(ctx, ownerOrErr.value.message);
			return;
		}

		sendOk(ctx, toOwnerDTO(ownerOrErr.value));
	};

	const router = new Router({ prefix: "/owners" });
	router.get("/", listOwnerHandler);
	router.get("/:ownerId", findOwnerHandler);
	return router;
}
