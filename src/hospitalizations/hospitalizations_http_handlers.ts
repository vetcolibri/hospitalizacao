import { getRequestContext, HttpHandler, processApplicationErrors } from "@shared/http_handler.ts";
import { HospitalizationsService, UpdateContactPersonRequest, UpdateDiagnosisRequest } from "./hospitalization_service.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";
import { Context } from "@deps/oak";

export function createHospitalizationHttpHandler(service: HospitalizationsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		try {
			const body = await req.json();
			const ctx = await getRequestContext(req);

			// Validate required fields
			const requiredFields = ['admissionDate', 'estimatedDischargeDate', 'petId', 'ownerId'];
			const missingFields = requiredFields.filter(field => !body[field]);

			if (missingFields.length > 0) {
				return new Response(
					JSON.stringify({
						error: 'Missing required fields',
						missingFields
					}),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}

			const idOrErr = await service.createHospitalization(ctx, {
				admissionDate: body.admissionDate,
				estimatedDischargeDate: body.estimatedDischargeDate,
				initialDiagnosis: body.initialDiagnosis,
				petId: body.petId,
				petName: body.petName,
				petAge: body.petAge,
				petWeight: body.petWeight,
				ownerId: body.ownerId,
				ownerName: body.ownerName,
				contactPersonName: body.contactPersonName,
				contactPersonPhoneNumber: body.contactPersonWhatsApp,
				contactPersonCountryCode: body.contactPersonCountryCode,
				contactPersonEmail: body.contactPersonEmail,
			});

			if (idOrErr.isLeft()) {
				return processApplicationErrors(idOrErr.value);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: { id: idOrErr.right.value }
				}),
				{
					status: 201,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: 'Invalid JSON payload'
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	};
}

export function updateContactPersonHttpHandler(service: HospitalizationsService) {
	return async (ctx: Context) => {
		try {
			const body = await ctx.request.body.json();
			const requestContext = await getRequestContext(ctx.request);
			const id = ctx.params?.id;

			if (!id) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "ID da hospitalização é obrigatório"
				};
				return;
			}

			// Validate required fields
			if (!body.name || !body.phoneNumber) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Nome e número de telefone são obrigatórios"
				};
				return;
			}

			const updateRequest: UpdateContactPersonRequest = {
				id,
				name: body.name,
				phoneNumber: body.phoneNumber,
				whatsapp: body.whatsapp || false,
				contactPersonEmail: body.contactPersonEmail,
			};

			const voidOrErr = await service.updateContactPerson(requestContext, updateRequest);

			if (voidOrErr.isLeft()) {
				const errorResponse = processApplicationErrors(voidOrErr.value);
				ctx.response.status = errorResponse.status;
				ctx.response.body = await errorResponse.json();
				return;
			}

			ctx.response.status = 200;
			ctx.response.body = {
				success: true,
				message: "Pessoa de contacto atualizada com sucesso"
			};
		} catch (error) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: "Invalid JSON payload"
			};
		}
	};
}

export function updateDiagnosisHttpHandler(service: HospitalizationsService) {
	return async (ctx: Context) => {
		try {
			const body = await ctx.request.body.json();
			const requestContext = await getRequestContext(ctx.request);
			const id = ctx.params?.id;

			if (!id) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "ID da hospitalização é obrigatório"
				};
				return;
			}

			// Validate required fields
			if (!body.actualDiagnosis || !Array.isArray(body.actualDiagnosis)) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Diagnóstico atual é obrigatório e deve ser um array"
				};
				return;
			}

			const updateRequest: UpdateDiagnosisRequest = {
				id,
				actualDiagnosis: body.actualDiagnosis,
			};

			const voidOrErr = await service.updateDiagnosis(requestContext, updateRequest);

			if (voidOrErr.isLeft()) {
				const errorResponse = processApplicationErrors(voidOrErr.value);
				ctx.response.status = errorResponse.status;
				ctx.response.body = await errorResponse.json();
				return;
			}

			ctx.response.status = 200;
			ctx.response.body = {
				success: true,
				message: "Diagnóstico atualizado com sucesso"
			};
		} catch (error) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: "Invalid JSON payload"
			};
		}
	};
}

export function dischargeHospitalizationHttpHandler(service: HospitalizationsService) {
	return async (ctx: Context) => {
		try {
			const body = await ctx.request.body.json();
			const requestContext = await getRequestContext(ctx.request);
			const id = ctx.params?.id;

			if (!id) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "ID da hospitalização é obrigatório"
				};
				return;
			}

			// Validate required fields
			if (!body.dischargeDate || !body.stateAtDischarge) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: "Data de alta e estado na alta são obrigatórios"
				};
				return;
			}

			const voidOrErr = await service.dischargeHospitalization(requestContext, {
				id,
				dischargeDate: body.dischargeDate,
				stateAtDischarge: body.stateAtDischarge,
			});

			if (voidOrErr.isLeft()) {
				const errorResponse = processApplicationErrors(voidOrErr.value);
				ctx.response.status = errorResponse.status;
				ctx.response.body = await errorResponse.json();
				return;
			}

			ctx.response.status = 200;
			ctx.response.body = {
				success: true,
				message: "Hospitalização finalizada com sucesso"
			};
		} catch (error) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: "Invalid JSON payload"
			};
		}
	};
}

export function createPeriodicReportHttpHandler(service: HospitalizationsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		try {
			const body = await req.json();
			const ctx = await getRequestContext(req);

			// Validate required fields
			if (!body.hospitalizationId || !body.timestamp) {
				return new Response(
					JSON.stringify({
						error: "ID da hospitalização e timestamp são obrigatórios"
					}),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}

			const voidOrErr = await service.createPeriodicReport(ctx, {
				hospitalizationId: body.hospitalizationId,
				timestamp: body.timestamp,
				consciousnessStates: body.consciousnessStates as ConsciousnessStateEnum,
				annotations: body.annotations,
				feedingRecord: body.feedingRecord,
				physicalDischarges: body.physicalDischarges,
			});

			if (voidOrErr.isLeft()) {
				return processApplicationErrors(voidOrErr.value);
			}

			return new Response(
				JSON.stringify({
					success: true,
					message: "Relatório periódico criado com sucesso"
				}),
				{
					status: 201,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: "Invalid JSON payload"
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	};
}
