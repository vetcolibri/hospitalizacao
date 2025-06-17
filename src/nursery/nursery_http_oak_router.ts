import { Router } from "https://deno.land/x/oak@v12.6.1/router.ts";
import { recordIntakeHttpHandler, recordOutputHttpHandler } from "./nursery_http_handlers.ts";
import { IntakeOutputService } from "./intake_output_service.ts";
import { createHttpOakFlowSheetRouter } from "./flowsheet_http_oak_router.ts";
import { FlowSheetService } from "./flowsheet_service.ts";

export function createHttpOakNurseryRouter(
	intakeOutputService: IntakeOutputService,
	flowSheetService: FlowSheetService,
): Router {
	const router = new Router();

	// Intake routes
	router.post(
		"/nursery/intake-outputs/:hospitalizationId/intakes",
		recordIntakeHttpHandler(intakeOutputService),
	);

	// Output routes
	router.post(
		"/nursery/intake-outputs/:hospitalizationId/eliminations",
		recordOutputHttpHandler(intakeOutputService),
	);

	// FlowSheet routes
	const flowSheetRouter = createHttpOakFlowSheetRouter(flowSheetService);
	router.use(flowSheetRouter.routes());
	router.use(flowSheetRouter.allowedMethods());

	return router;
}
