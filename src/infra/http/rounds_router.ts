import { RoundService } from "application/round_service.ts";
import { Context, Router } from "deps";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "./context_with_params.ts";
import { sendOk } from "./responses.ts";
import { sendBadRequest } from "./responses.ts";
import { roundSchema } from "./schemas/round_schema.ts";

export default function (service: RoundService) {
  const newRoundHandler = async (ctx: Context) => {
    const { patientId, parameters } = ctx.state.validatedData;
    const resultOrError = await service.new(patientId, parameters);
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
    const results = parameters.map((p) => ({
      name: p.name,
      value: p.value,
      issuedAt: p.issuedAt,
    }));
    sendOk(ctx, results);
  };

  const measurementsHandler = async (ctx: ContextWithParams) => {
    const patientId = ctx.params.patientId;
    const resultOrError = await service.measurements(patientId);
    if (resultOrError.isLeft()) {
      sendBadRequest(ctx, resultOrError.value.message);
      return;
    }
    const results = resultOrError.value.map((p) => ({
      name: p.name,
      value: p.value,
      issuedAt: p.issuedAt,
    }));
    sendOk(ctx, results);
  };

  const router = new Router({ prefix: "/rounds" });
  router.post("/new", validate(roundSchema), newRoundHandler);
  router.get("/measurements/latest/:patientId", latestMeasurementsHandler);
  router.get("/measurements/:patientId", measurementsHandler);
  return router;
}
