import { getRequestContext, HttpHandler, processApplicationErrors } from "@shared/http_handler.ts";
import { PetsService } from "./pets_service.ts";

export function createOwnerHttpHandler(service: PetsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		const body = await req.json();
		const ctx = await getRequestContext(req);

		const idOrErr = await service.createOwner(ctx, {
			name: body.name,
			orangestId: body.orangestId,
			phoneNumbers: body.phoneNumbers,
		});

		if (idOrErr.isLeft()) {
			return processApplicationErrors(idOrErr.value);
		}

		return new Response(JSON.stringify({ id: idOrErr.right }), { status: 201 });
	};
}
