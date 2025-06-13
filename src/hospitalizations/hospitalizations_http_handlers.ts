import { getRequestContext, HttpHandler, processApplicationErrors } from "@shared/http_handler.ts";
import { HospitalizationsService } from "./hospitalization_service.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";

export function createHospitalizationHttpHandler(service: HospitalizationsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		const body = await req.json();
		const ctx = await getRequestContext(req);

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

		return new Response(JSON.stringify({ id: idOrErr.right.value }), { status: 201 });
	};
}

export function updateContactPersonHttpHandler(service: HospitalizationsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		const body = await req.json();
		const ctx = await getRequestContext(req);
		const url = new URL(req.url);
		const id = url.pathname.split("/").pop();

		if (!id) {
			return new Response(JSON.stringify({ error: "ID da hospitalização é obrigatório" }), {
				status: 400,
			});
		}

		const updateRequest: UpdateContactPersonRequest = {
			id,
			contactPersonName: body.contactPersonName,
			contactPersonWhatsApp: body.contactPersonWhatsApp,
			contactPersonCountryCode: body.contactPersonCountryCode,
			contactPersonEmail: body.contactPersonEmail,
		};

		const voidOrErr = await service.updateContactPerson(ctx, updateRequest);

		if (voidOrErr.isLeft()) {
			return processApplicationErrors(voidOrErr.value);
		}

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	};
}

export function updateDiagnosisHttpHandler(service: HospitalizationsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		const body = await req.json();
		const ctx = await getRequestContext(req);
		const url = new URL(req.url);
		const id = url.pathname.split("/").pop();

		if (!id) {
			return new Response(JSON.stringify({ error: "ID da hospitalização é obrigatório" }), {
				status: 400,
			});
		}

		const updateRequest: UpdateDiagnosisRequest = {
			id,
			actualDiagnosis: body.actualDiagnosis,
		};

		const voidOrErr = await service.updateDiagnosis(ctx, updateRequest);

		if (voidOrErr.isLeft()) {
			return processApplicationErrors(voidOrErr.value);
		}

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	};
}

export function dischargeHospitalizationHttpHandler(service: HospitalizationsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		const body = await req.json();
		const ctx = await getRequestContext(req);
		const url = new URL(req.url);
		const id = url.pathname.split("/").pop();

		if (!id) {
			return new Response(JSON.stringify({ error: "ID da hospitalização é obrigatório" }), {
				status: 400,
			});
		}

		const voidOrErr = await service.dischargeHospitalization(ctx, {
			id,
			dischargeDate: body.dischargeDate,
			stateAtDischarge: body.stateAtDischarge,
		});

		if (voidOrErr.isLeft()) {
			return processApplicationErrors(voidOrErr.value);
		}

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	};
}

export function createPeriodicReportHttpHandler(service: HospitalizationsService): HttpHandler {
	return async (req: Request): Promise<Response> => {
		const body = await req.json();
		const ctx = await getRequestContext(req);

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

		return new Response(JSON.stringify({ success: true }), { status: 201 });
	};
}
