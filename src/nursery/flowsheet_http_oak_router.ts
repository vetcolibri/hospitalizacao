import { Router } from "https://deno.land/x/oak@v12.6.1/router.ts";
import {
	getAvailableMeasurementTypesHttpHandler,
	getAvailableRoundTypesHttpHandler,
	recordContinuousMeasurementsHttpHandler,
	recordMedicalRoundHttpHandler,
} from "./flowsheet_http_handlers.ts";
import { FlowSheetService } from "./flowsheet_service.ts";

export function createHttpOakFlowSheetRouter(service: FlowSheetService): Router {
	const router = new Router();

	// Medical round routes
	router.post(
		"/nursery/flowsheets/:hospitalizationId/medical-rounds",
		recordMedicalRoundHttpHandler(service),
	);

	// Continuous measurements routes
	router.post(
		"/nursery/flowsheets/:hospitalizationId/continuous-measurements",
		recordContinuousMeasurementsHttpHandler(service),
	);

	// Reference data routes
	router.get(
		"/nursery/flowsheets/round-types",
		getAvailableRoundTypesHttpHandler(),
	);

	router.get(
		"/nursery/flowsheets/measurement-types",
		getAvailableMeasurementTypesHttpHandler(),
	);

	return router;
}
