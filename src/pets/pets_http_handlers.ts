import { getRequestContext, HttpHandler, processApplicationErrors } from "@shared/http_handler.ts";
import { PetsService } from "./pets_service.ts";

export function createOwnerHttpHandler(service: PetsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		try {
			const body = await req.json();
			const ctx = await getRequestContext(req);

			// Validate required fields
			const requiredFields = ["name", "orangestId", "phoneNumbers"];
			const missingFields = requiredFields.filter((field) => !body[field]);

			if (missingFields.length > 0) {
				return new Response(
					JSON.stringify({
						error: "Missing required fields",
						missingFields,
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			// Validate phoneNumbers is array and not empty
			if (!Array.isArray(body.phoneNumbers) || body.phoneNumbers.length === 0) {
				return new Response(
					JSON.stringify({
						error: "phoneNumbers must be a non-empty array",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const idOrErr = await service.createOwner(ctx, {
				name: body.name,
				orangestId: body.orangestId,
				phoneNumbers: body.phoneNumbers,
			});

			if (idOrErr.isLeft()) {
				return processApplicationErrors(idOrErr.value);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: { id: idOrErr.right.value },
				}),
				{
					status: 201,
					headers: { "Content-Type": "application/json" },
				},
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: "Invalid JSON payload",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	};
}

export function updateOwnerHttpHandler(service: PetsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		try {
			const body = await req.json();
			const ctx = await getRequestContext(req);
			const url = new URL(req.url);
			const id = url.pathname.split("/").pop();

			if (!id) {
				return new Response(
					JSON.stringify({
						error: "ID do owner é obrigatório",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			// Validate required fields
			const requiredFields = ["name", "phoneNumbers"];
			const missingFields = requiredFields.filter((field) => !body[field]);

			if (missingFields.length > 0) {
				return new Response(
					JSON.stringify({
						error: "Missing required fields",
						missingFields,
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			// Validate phoneNumbers is array and not empty
			if (!Array.isArray(body.phoneNumbers) || body.phoneNumbers.length === 0) {
				return new Response(
					JSON.stringify({
						error: "phoneNumbers must be a non-empty array",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const voidOrErr = await service.updateOwner(ctx, {
				id,
				name: body.name,
				phoneNumbers: body.phoneNumbers,
			});

			if (voidOrErr.isLeft()) {
				return processApplicationErrors(voidOrErr.value);
			}

			return new Response(
				JSON.stringify({
					success: true,
					message: "Owner atualizado com sucesso",
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: "Invalid JSON payload",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	};
}
