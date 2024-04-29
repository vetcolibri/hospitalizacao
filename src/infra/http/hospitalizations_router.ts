import { HospitalizationService } from "application/hospitalization_service.ts";
import { Context, Router } from "deps";
import { Hospitalization } from "domain/patients/hospitalizations/hospitalization.ts";
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
	let dischargeDate: string = "";
	if (hospitalization.dischargeDate) {
		dischargeDate = String(hospitalization.dischargeDate.toISOString());
	}
	return {
		hospitalizationId: hospitalization.hospitalizationId.value,
		patientId: hospitalization.patientId.value,
		weight: hospitalization.weight,
		complaints: hospitalization.complaints,
		diagnostics: hospitalization.diagnostics,
		entryDate: hospitalization.entryDate.toISOString(),
		dischargeDate,
		status: hospitalization.status,
	};
}

export default function (service: HospitalizationService) {
	const listOpenedHospitalizationHandler = async (context: Context) => {
		const hospitalizations = await service.getAll();
		const hospitalizationDTO: HospitalizationDTO[] = hospitalizations.map(toHospitalizationDTO);
		sendOk(context, hospitalizationDTO);
	};

	const router = new Router({ prefix: "/hospitalizations" });
	router.get("/", listOpenedHospitalizationHandler);
	return router;
}
