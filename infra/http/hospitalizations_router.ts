import { HospitalizationService } from "application/hospitalization_service.ts";
import { Context, Router } from "deps";
import { ContactData } from "domain/hospitalization/contact.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { RecentHospitalization } from "domain/hospitalization/recent_hospitalization.ts";
import { sendBadRequest, sendOk } from "infra/http/responses.ts";

interface HospitalizationDTO {
	hospitalizationId: string;
	patientId: string;
	weight: number;
	complaints: string[];
	diagnostics: string[];
	status: string;
	entryDate: string;
	dischargeDate?: string;
	/** Excepção guardada no episódio, se existir (RF-13). */
	contact?: ContactData;
}

function toHospitalizationDTO(hospitalization: Hospitalization): HospitalizationDTO {
	return {
		hospitalizationId: hospitalization.hospitalizationId.value,
		patientId: hospitalization.patientId.value,
		weight: hospitalization.weight,
		complaints: hospitalization.complaints,
		diagnostics: hospitalization.diagnostics,
		entryDate: hospitalization.entryDate.toISOString(),
		dischargeDate: hospitalization.dischargeDate?.toISOString() ?? undefined,
		status: hospitalization.status,
		contact: hospitalization.contact
			? {
				name: hospitalization.contact.name,
				phoneNumber: hospitalization.contact.phoneNumber,
				whatsapp: hospitalization.contact.whatsapp,
			}
			: undefined,
	};
}

/**
 * Linha da listagem de últimos internamentos. Campos mínimos para a navegação
 * e leitura; nunca telefone, WhatsApp, queixas, diagnóstico ou outros dados
 * clínicos.
 */
interface RecentHospitalizationDTO {
	hospitalizationId: string;
	systemId: string;
	entryDate: string;
	dischargeDate?: string;
	status: string;
	patientId: string;
	patientName: string;
	ownerId: string;
	ownerName: string;
}

function toRecentHospitalizationDTO(item: RecentHospitalization): RecentHospitalizationDTO {
	return {
		hospitalizationId: item.hospitalizationId,
		systemId: item.systemId,
		entryDate: item.entryDate.toISOString(),
		dischargeDate: item.dischargeDate?.toISOString(),
		status: item.status,
		patientId: item.patientId,
		patientName: item.patientName,
		ownerId: item.ownerId,
		ownerName: item.ownerName,
	};
}

export default function (service: HospitalizationService) {
	const listOpenedHospitalizationHandler = async (ctx: Context) => {
		const hospitalizations = await service.findAllOpen();
		sendOk(ctx, hospitalizations.map(toHospitalizationDTO));
	};

	const listRecentHandler = async (ctx: Context) => {
		const searchParams = ctx.request.url.searchParams;

		const result = await service.findRecent({
			term: searchParams.get("term") ?? undefined,
			from: searchParams.get("from") ?? undefined,
			to: searchParams.get("to") ?? undefined,
		});

		if (result.isLeft()) {
			sendBadRequest(ctx, result.value.message);
			return;
		}

		sendOk(ctx, result.value.map(toRecentHospitalizationDTO));
	};

	const router = new Router({ prefix: "/hospitalizations" });
	router.get("/recent", listRecentHandler);
	router.get("/", listOpenedHospitalizationHandler);
	return router;
}
