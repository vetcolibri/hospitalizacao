import { Router } from "https://deno.land/x/oak@v12.6.1/router.ts";
import { adaptOakRequest } from "@shared/adapt_oak_request.ts";
import {
	createHospitalizationHttpHandler,
	createPeriodicReportHttpHandler,
	dischargeHospitalizationHttpHandler,
	updateContactPersonHttpHandler,
	updateDiagnosisHttpHandler,
} from "./hospitalizations_http_handlers.ts";
import { HospitalizationsService } from "./hospitalization_service.ts";

export function createHttpOakHospitalizationsRouter(service: HospitalizationsService): Router {
	const router = new Router();

	// Hospitalization routes
	router.post("/hospitalizations", adaptOakRequest(createHospitalizationHttpHandler(service)));
	router.put(
		"/hospitalizations/:id/contact-person",
		adaptOakRequest(updateContactPersonHttpHandler(service)),
	);
	router.put(
		"/hospitalizations/:id/diagnosis",
		adaptOakRequest(updateDiagnosisHttpHandler(service)),
	);
	router.post(
		"/hospitalizations/:id/discharge",
		adaptOakRequest(dischargeHospitalizationHttpHandler(service)),
	);

	// Periodic report routes
	router.post("/periodic-reports", adaptOakRequest(createPeriodicReportHttpHandler(service)));

	return router;
}
