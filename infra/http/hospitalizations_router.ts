import { HospitalizationService } from "application/hospitalization_service.ts";
import { Context, Router } from "deps";
import { ContactData } from "domain/hospitalization/contact.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { sendOk } from "infra/http/responses.ts";

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

export default function (service: HospitalizationService) {
	const listOpenedHospitalizationHandler = async (ctx: Context) => {
		const hospitalizations = await service.findAllOpen();
		sendOk(ctx, hospitalizations.map(toHospitalizationDTO));
	};

	const router = new Router({ prefix: "/hospitalizations" });
	router.get("/", listOpenedHospitalizationHandler);
	return router;
}
