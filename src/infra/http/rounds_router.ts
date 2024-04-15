import { RoundService } from "application/round_service.ts";
import { Context, Router } from "deps";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendOk } from "./responses.ts";
import { sendBadRequest } from "./responses.ts";
import { roundSchema } from "./schemas/round_schema.ts";
import { Parameter } from "../../domain/exams/parameters/parameter.ts";

interface ParameterDTO {
	name: string;
	value: unknown;
	issuedAt: string;
}

function toParameterDTO(measurement: Parameter): ParameterDTO {
	return {
		name: measurement.name,
		value: measurement.value,
		issuedAt: measurement.issuedAt.toISOString(),
	};
}

export default function (service: RoundService) {
	const newRoundHandler = async (ctx: Context) => {
		const { patientId, parameters } = ctx.state.validatedData;
		const voidOrErr = await service.new(patientId, parameters);

		if (voidOrErr.isLeft()) {
			sendBadRequest(ctx, voidOrErr.value.message);
			return;
		}

		sendOk(ctx);
	};

	const latestMeasurementsHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const parametersOrErr = await service.latestMeasurements(patientId);

		if (parametersOrErr.isLeft()) {
			sendBadRequest(ctx, parametersOrErr.value.message);
			return;
		}

		const parameters = parametersOrErr.value;
		const parameterDTO = parameters.map(toParameterDTO);

		sendOk(ctx, parameterDTO);
	};

	const measurementsHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const resultOrErr = await service.measurements(patientId);
		if (resultOrErr.isLeft()) {
			sendBadRequest(ctx, resultOrErr.value.message);
			return;
		}

		const parameterDTO = resultOrErr.value.map(toParameterDTO);

		sendOk(ctx, parameterDTO);
	};

	const router = new Router({ prefix: "/rounds" });
	router.post("/new", validate(roundSchema), newRoundHandler);
	router.get("/measurements/latest/:patientId", latestMeasurementsHandler);
	router.get("/measurements/:patientId", measurementsHandler);
	return router;
}
