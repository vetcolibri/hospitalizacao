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
		const parametersOrError = await service.latestMeasurements(patientId);
		if (parametersOrError.isLeft()) {
			sendBadRequest(ctx, parametersOrError.value.message);
			return;
		}
		const parameters = parametersOrError.value;
		const result = parameters.map((p) => ({
			name: p.name,
			value: p.getValue(),
			issuedAt: p.issuedAt,
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
	};

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
