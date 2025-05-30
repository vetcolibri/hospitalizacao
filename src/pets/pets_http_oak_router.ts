import { Router } from "https://deno.land/x/oak@v12.6.1/router.ts";
import { adaptOakRequest } from "@shared/adapt_oak_request.ts";
import { createOwnerHttpHandler } from "./pets_http_handlers.ts";
import { PetsService } from "./pets_service.ts";

export function createHttpOakPetsRouter(service: PetsService): Router {
	const router = new Router();

	router.post("/owners", adaptOakRequest(createOwnerHttpHandler(service)));

	return router;
}
