import { getRequestContext, HttpHandler, processApplicationErrors } from "@shared/http_handler.ts";
import {
	FlowSheetService,
	RecordContinuousMeasurementsRequest,
	RecordMedicalRoundRequest,
} from "./flowsheet_service.ts";
import { MeasurementTypeEnum } from "./measurement_type_enum.ts";
import { RoundPlan } from "./round_plan.ts";
import { Context, RouterContext } from "@deps/oak";

export function recordMedicalRoundHttpHandler(service: FlowSheetService) {
	return async (ctx: RouterContext<"/nursery/flowsheets/:hospitalizationId/medical-rounds">) => {
		try {
			const body = await ctx.request.body({ type: "json" }).value;
			const stdRequest = new Request(ctx.request.url.toString(), {
				headers: ctx.request.headers,
				method: ctx.request.method,
			});
			const requestContext = await getRequestContext(stdRequest);
			const hospitalizationId = ctx.params?.hospitalizationId;

			if (!hospitalizationId) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "ID da hospitalização é obrigatório",
				};
				return;
			}

			// Validate required fields
			if (!body.dateTime || !body.roundType) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Data/hora e tipo de ronda são obrigatórios",
				};
				return;
			}

			// Validate round type
			const availableRoundTypes = RoundPlan.getAvailableRoundTypes();
			if (!availableRoundTypes.includes(body.roundType)) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Tipo de ronda inválido",
					availableRoundTypes,
				};
				return;
			}

			// Validate measurements array
			if (!body.measurements || !Array.isArray(body.measurements)) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Medições são obrigatórias e devem ser um array",
				};
				return;
			}

			// Validate each measurement
			for (const measurement of body.measurements) {
				if (!measurement.measurementTypeId || !measurement.value) {
					ctx.response.status = 400;
					ctx.response.body = {
						error: "Cada medição deve ter measurementTypeId e value",
					};
					return;
				}
			}

			const recordRequest: RecordMedicalRoundRequest = {
				hospitalizationId,
				dateTime: body.dateTime,
				roundType: body.roundType,
				measurements: body.measurements,
			};

			const voidOrErr = await service.recordMedicalRound(requestContext, recordRequest);

			if (voidOrErr.isLeft()) {
				const errorResponse = processApplicationErrors(voidOrErr.value);
				ctx.response.status = errorResponse.status;
				ctx.response.body = await errorResponse.json();
				return;
			}

			ctx.response.status = 201;
			ctx.response.body = {
				success: true,
				message: "Ronda médica registrada com sucesso",
			};
		} catch (error) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: "Invalid JSON payload",
			};
		}
	};
}

export function recordContinuousMeasurementsHttpHandler(service: FlowSheetService) {
	return async (
		ctx: RouterContext<"/nursery/flowsheets/:hospitalizationId/continuous-measurements">,
	) => {
		try {
			const body = await ctx.request.body({ type: "json" }).value;
			const stdRequest = new Request(ctx.request.url.toString(), {
				headers: ctx.request.headers,
				method: ctx.request.method,
			});
			const requestContext = await getRequestContext(stdRequest);
			const hospitalizationId = ctx.params?.hospitalizationId;

			if (!hospitalizationId) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "ID da hospitalização é obrigatório",
				};
				return;
			}

			// Validate required fields
			if (!body.dateTime) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Data/hora é obrigatória",
				};
				return;
			}

			// Validate measurements array
			if (!body.measurements || !Array.isArray(body.measurements)) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Medições são obrigatórias e devem ser um array",
				};
				return;
			}

			if (body.measurements.length === 0) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Deve haver pelo menos uma medição",
				};
				return;
			}

			// Validate each measurement
			for (const measurement of body.measurements) {
				if (!measurement.measurementTypeId || !measurement.value) {
					ctx.response.status = 400;
					ctx.response.body = {
						error: "Cada medição deve ter measurementTypeId e value",
					};
					return;
				}

				// Validate measurement ID against enum
				if (!Object.values(MeasurementTypeEnum).includes(measurement.measurementTypeId)) {
					ctx.response.status = 400;
					ctx.response.body = {
						error: `Tipo de medição inválido: ${measurement.measurementTypeId}`,
						validMeasurementTypes: Object.values(MeasurementTypeEnum),
					};
					return;
				}
			}

			const recordRequest: RecordContinuousMeasurementsRequest = {
				hospitalizationId,
				dateTime: body.dateTime,
				measurements: body.measurements,
			};

			const voidOrErr = await service.recordContinuousMeasurements(requestContext, recordRequest);

			if (voidOrErr.isLeft()) {
				const errorResponse = processApplicationErrors(voidOrErr.value);
				ctx.response.status = errorResponse.status;
				ctx.response.body = await errorResponse.json();
				return;
			}

			ctx.response.status = 201;
			ctx.response.body = {
				success: true,
				message: "Medições contínuas registradas com sucesso",
			};
		} catch (error) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: "Invalid JSON payload",
			};
		}
	};
}

export function getAvailableRoundTypesHttpHandler() {
	return async (ctx: RouterContext<"/nursery/flowsheets/round-types">) => {
		try {
			const roundTypes = RoundPlan.getAvailableRoundTypes();
			const roundPlans = roundTypes.map((type) => ({
				roundType: type,
				measurements: RoundPlan.getMeasurementsForRound(type),
			}));

			ctx.response.status = 200;
			ctx.response.body = {
				success: true,
				data: {
					roundTypes,
					roundPlans,
				},
			};
		} catch (error) {
			ctx.response.status = 500;
			ctx.response.body = {
				error: "Internal server error",
			};
		}
	};
}

export function getAvailableMeasurementTypesHttpHandler() {
	return async (ctx: RouterContext<"/nursery/flowsheets/measurement-types">) => {
		try {
			const measurementTypes = Object.values(MeasurementTypeEnum);

			ctx.response.status = 200;
			ctx.response.body = {
				success: true,
				data: {
					measurementTypes,
				},
			};
		} catch (error) {
			ctx.response.status = 500;
			ctx.response.body = {
				error: "Internal server error",
			};
		}
	};
}
