import { getRequestContext, HttpHandler, processApplicationErrors } from "@shared/http_handler.ts";
import {
	IntakeOutputService,
	RecordIntakeRequest,
	RecordOutputRequest,
} from "./intake_output_service.ts";
import { FeedingTypeEnum } from "./feeding_type_enum.ts";
import { FeedingCategoryEnum } from "./feeding_category_enum.ts";
import { EliminationTypeEnum } from "./elimination_type_enum.ts";
import { Context, RouterContext } from "@deps/oak";

export function recordIntakeHttpHandler(service: IntakeOutputService) {
	return async (ctx: RouterContext<"/nursery/intake-outputs/:hospitalizationId/intakes">) => {
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
			if (!body.dateTime || !body.type) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Data/hora e tipo são obrigatórios",
				};
				return;
			}

			// Validate feeding type enum
			if (!Object.values(FeedingTypeEnum).includes(body.type)) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Tipo de alimentação inválido",
				};
				return;
			}

			// Validate feeding category if provided
			if (
				body.feedingCategory && !Object.values(FeedingCategoryEnum).includes(body.feedingCategory)
			) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Categoria de alimentação inválida",
				};
				return;
			}

			const recordRequest: RecordIntakeRequest = {
				hospitalizationId,
				dateTime: body.dateTime,
				type: body.type as FeedingTypeEnum,
				notes: body.notes || "",
				feedingCategory: body.feedingCategory as FeedingCategoryEnum,
				appetiteScore: body.appetiteScore,
			};

			const voidOrErr = await service.recordIntake(requestContext, recordRequest);

			if (voidOrErr.isLeft()) {
				const errorResponse = processApplicationErrors(voidOrErr.value);
				ctx.response.status = errorResponse.status;
				ctx.response.body = await errorResponse.json();
				return;
			}

			ctx.response.status = 201;
			ctx.response.body = {
				success: true,
				message: "Registro de entrada criado com sucesso",
			};
		} catch (error) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: "Invalid JSON payload",
			};
		}
	};
}

export function recordOutputHttpHandler(service: IntakeOutputService) {
	return async (ctx: RouterContext<"/nursery/intake-outputs/:hospitalizationId/eliminations">) => {
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
			if (!body.dateTime || !body.type || !body.aspect) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Data/hora, tipo e aspecto são obrigatórios",
				};
				return;
			}

			// Validate elimination type enum
			if (!Object.values(EliminationTypeEnum).includes(body.type)) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Tipo de eliminação inválido",
				};
				return;
			}

			const recordRequest: RecordOutputRequest = {
				hospitalizationId,
				dateTime: body.dateTime,
				type: body.type as EliminationTypeEnum,
				aspect: body.aspect,
			};

			const voidOrErr = await service.recordOutput(requestContext, recordRequest);

			if (voidOrErr.isLeft()) {
				const errorResponse = processApplicationErrors(voidOrErr.value);
				ctx.response.status = errorResponse.status;
				ctx.response.body = await errorResponse.json();
				return;
			}

			ctx.response.status = 201;
			ctx.response.body = {
				success: true,
				message: "Registro de eliminação criado com sucesso",
			};
		} catch (error) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: "Invalid JSON payload",
			};
		}
	};
}
