import { HospitalizationService } from "application/hospitalization_service.ts";
import { Context, Router } from "deps";
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
}

function toHospitalizationDTO(hospitalization: Hospitalization): HospitalizationDTO {
	return {
		hospitalizationId: hospitalization.hospitalizationId.value,
		patientId: hospitalization.patientId.value,
		weight: hospitalization.weight,
		complaints: hospitalization.complaints,
		diagnostics: hospitalization.diagnostics,
		entryDate: hospitalization.entryDate.toISOString(),
		dischargeDate: hospitalization.dischargeDate!.toISOString() ?? undefined,
		status: hospitalization.status,
	};
}

export default function (service: HospitalizationService) {
	const listOpenedHospitalizationHandler = async (ctx: Context) => {
		const hospitalizations = await service.findAll();
		sendOk(ctx, hospitalizations.map(toHospitalizationDTO));
	};

	const router = new Router({ prefix: "/hospitalizations" });
	router.get("/", listOpenedHospitalizationHandler);
	return router;
}
