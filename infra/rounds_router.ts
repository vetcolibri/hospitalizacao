import { Context, Router } from "../deps.ts";
import { validate } from "../shared/tools.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendOk } from "./responses.ts";
import { sendBadRequest } from "./responses.ts";
import { roundSchema } from "./schemas/round_schema.ts";
import { InmemServicesFactory } from "./services.ts";

const factory = new InmemServicesFactory();
const service = factory.createRoundService();

export default function () {
	const newRoundHandler = async (ctx: Context) => {
		const { patientId, userId, parameters } = ctx.state.validatedData;
		const resultOrError = await service.new(patientId, userId, parameters);
		if (resultOrError.isLeft()) {
			sendBadRequest(ctx, resultOrError.value.message);
			return;
		}
		sendOk(ctx);
	};

	const latestMeasurementsHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const parameters = await service.latestMeasurements(patientId);
		const result = parameters.map((p) => ({
			name: p.name,
			value: p.getValue(),
			issudeAt: p.issuedAt,
		}));
		sendOk(ctx, result);
	};

	const measurementsHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const resultOrError = await service.measurements(patientId);
		if (resultOrError.isLeft()) {
			sendBadRequest(ctx, resultOrError.value.message);
			return;
		}
		sendOk(ctx, resultOrError.value);
	}

	const router = new Router({ prefix: "/rounds" });
	router.post("/new", validate(roundSchema), newRoundHandler);
	router.get(
		"/latest-measurements/:patientId",
		latestMeasurementsHandler,
	);
	router.get(
		"/measurements/:patientId",
		measurementsHandler,
	);
	return router;
}
